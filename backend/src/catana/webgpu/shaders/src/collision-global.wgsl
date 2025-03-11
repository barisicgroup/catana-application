// Collision (global)

struct Elem {
    xyz: vec3<f32>,
    radiusPm_elemId: u32
};

// Inputs
@group(0) @binding(0) var<storage, read> in_elems: array<Elem>;
@group(0) @binding(1) var<storage, read> in_bonds: array< array<u32, 4> >;

//@group(0) @binding(1) var<storage, read> in_perComp_matrix: array< mat4x4<f32> >;
//@group(0) @binding(1) var<storage, read> in_perBin_elemCount: array<u32>;
@group(0) @binding(2) var<storage, read> in_perBin_elemCount_scan: array<u32>;

// Outputs
@group(0) @binding(3) var<storage, read_write> out_collisions: array<u32>; // Must be initialized with zeros

// Other parameters group
struct GridParams {
    gridMin: vec3<f32>, // + f32 padding
    gridMax: vec3<f32>, // + f32 padding
    gridBinSize: vec3<f32>
};
@group(0) @binding(4) var<uniform> gridParams: GridParams;

struct CollisionParams {
    lenience: f32
}
@group(0) @binding(5) var<uniform> collisionParams: CollisionParams;

const U32_MAX: u32 = 0xffffffffu;
const NUL = -1;

// Local (workgroup) buffers
const WORKGROUP_SIZE = 256u;
const ONE_OVER_32: f32 = 0.03125;
var<workgroup> wg: array<atomic<u32>, 8>; // = WORKGROUP_SIZE / 32

fn lessThan(v1: vec3<f32>, v2: vec3<f32>) -> vec3<bool> {
    return vec3<bool>(v1.x < v2.x, v1.y < v2.y, v1.z < v2.z);
}
fn greaterThanEqual(v1: vec3<f32>, v2: vec3<f32>) -> vec3<bool> {
    return vec3<bool>(v1.x >= v2.x, v1.y >= v2.y, v1.z >= v2.z);
}

fn _3d_to_1d(v: vec3<f32>, gridSize: vec3<i32>) -> i32 {
    if (any(lessThan(v, gridParams.gridMin))) { return NUL; }
    if (any(greaterThanEqual(v, gridParams.gridMax))) { return NUL; }

    let i = clamp(vec3<i32>(floor((v - gridParams.gridMin) / gridParams.gridBinSize)), vec3<i32>(0), gridSize);

    return (i.x) + (i.y * gridSize.x) + (i.z * gridSize.x * gridSize.y);
}

fn getNeighborBins(_3d: vec3<f32>, gridSize: vec3<i32>) -> array< i32, 27> {
    var neighborBins: array< i32, 27 >;

    //let gridSize = vec3<u32>(floor((gridParams.gridMax - gridParams.gridMin) / gridParams.gridBinSize));
    //var _1d = _3d_to_1d(v, gridSize);

    var i = 0;
    // First Z, then Y, then X... for cache coherence :)
    for (var zi = -1.0; zi < 2.0; zi = zi + 1.0) {
        for (var yi = -1.0; yi < 2.0; yi = yi + 1.0) {
            for (var xi = -1.0; xi < 2.0; xi = xi + 1.0) {
                var n_pos = _3d + vec3<f32>(xi, yi, zi);
                var n_binId = _3d_to_1d(n_pos, gridSize);
                neighborBins[i] = n_binId;
                i = i + 1;
            }
        }
    }

    return neighborBins;
}

fn getBinElemCount(binId: i32, binScan: i32, numBins: i32, numElems: i32) -> i32 {
    if (binId == numBins - 1) {
        return numElems - binScan;
    }
    let nextBinId = binId + 1;
    let nextBinScan = i32(in_perBin_elemCount_scan[nextBinId]);
    let count = nextBinScan - binScan;
    return count;
}

@compute @workgroup_size(256)
fn main(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>) {

    // Thread stuff
    let numElems: u32 = arrayLength(&in_elems);
    let tid = global_id.x;

    // (work)Group stuff
    let gid = local_id.x;
    // TODO use workgroups better here. Maybe preload the entire neighborhood or something

    // Subgroup stuff
    let subgroup_id: u32 = u32(floor((f32(gid) * ONE_OVER_32)));
    let sid: u32 = 31u - (gid % 32u);
    let subgroup_output = &wg[subgroup_id];

    let bit = 1u << (sid);

    if (sid == 0u) {
        atomicStore(subgroup_output, 0u); // Initialize all subgroup binary "collision detected" u32s
    }

    workgroupBarrier();

    var collides: bool = false;
    if (tid < numElems) { // Out of bounds check

        // This element
        let elem = in_elems[tid];
        let bonds: array<u32, 4> = in_bonds[tid];
        let pos: vec3<f32> = elem.xyz;
        let radius: f32 = f32(elem.radiusPm_elemId >> 24u) * 0.01f; // *0.01 -> picometer to Angstrom
        //let elemId: u32 = elem.radiusPm_elemId & 0x00ffffffu; // Currently unused :)

        let numBins: i32 = i32(arrayLength(&in_perBin_elemCount_scan));
        //let radius = gridParams.elemRadius;
        //let diameter_squared = radius * radius * 4.0;

        let gridSize = vec3<i32>(floor((gridParams.gridMax - gridParams.gridMin) / gridParams.gridBinSize));
        let _1d = _3d_to_1d(pos, gridSize);

        // TODO debug remove
        //if (tid == 0u) {
        //    atomicStore(subgroup_output, u32(pos.y));
        //}

        if (_1d != NUL) {
            let neighbors = getNeighborBins(pos, gridSize);
            for (var i = 0; i < 27 && !collides; i = i + 1) {

                let binId = neighbors[i];
                if (binId == NUL) {
                    continue; // Skip bin if ID is out of bounds
                }
                var tid2 = in_perBin_elemCount_scan[binId]; // Called 'tid2' but not actually a thread ID... just to be consistent with 'tid' :)

                //let elemCount = i32(in_perBin_elemCount[binId]);
                let elemCount = getBinElemCount(binId, i32(tid2), numBins, i32(numElems));

                for (var j = 0; j < elemCount && !collides; j = j + 1) {

                    // Other element
                    let elem2 = in_elems[tid2];
                    let pos2: vec3<f32> = elem2.xyz;
                    let radius2: f32 = f32(elem2.radiusPm_elemId >> 24u) * 0.01f; // *0.01 -> picometer to Angstrom
                    let elemId2: u32 = elem2.radiusPm_elemId & 0x00ffffffu;

                    // Calculate min distance based on the radii of this element (tid) and the other element (tid2)
                    let min_distance: f32 = radius + radius2 - collisionParams.lenience;//radius * radius2 * 4.0;
                    //let min_distance: f32 = 1.0;
                    let min_distance_squared = min_distance * min_distance;

                    // Calculate distance between this element (tid) and the other element (tid2)
                    let pos_to_pos2 = pos2 - pos;
                    let distance_squared: f32 = dot(pos_to_pos2, pos_to_pos2);
                    //let effective_distance: f32 = sqrt(distance_squared) + collisionParams.lenience;
                    //let effective_distance_squared: f32 = effective_distance * effective_distance;
                    //let distance: f32 = distance(pos, pos2) + collisionParams.lenience;
                    //let distance_squared: f32 = distance * distance;

                    // Distance check
                    collides = distance_squared < min_distance_squared;

                    // Sameness check
                    // If this element (tid) and the other element (tid2) are the same, there can be no collision
                    collides = collides & (tid2 != tid);

                    // Bond check
                    for (var bondi = 0u; bondi < 4u; bondi = bondi + 1u) {
                        let bond: u32 = bonds[bondi];
                        let hasBond: bool = bond == elemId2;
                        collides = collides & !hasBond;
                    }
                    tid2 = tid2 + 1u;
                }
            }
        }
    }

    //workgroupBarrier(); // TODO probably uncomment for workgroup reduction

    //if (tid == 0u) {
    if (collides) {
        atomicOr(subgroup_output, bit); // TODO make this better with workgroup reduction
    }

    workgroupBarrier();

    if (sid == 0u) {
        //let collisionUnitId: u32 = u32(floor(f32(tid) * ONE_OVER_32));
        //let collisionUnitId: u32 = (workgroup_id.x * u32(8)) + gid;
        let chunkId: u32 = subgroup_id + (workgroup_id.x * 8u);
        let numChunks: u32 = arrayLength(&out_collisions);
        if (chunkId < numChunks) { // Bounds check
            let subgroup_bits: u32 = atomicLoad(subgroup_output);
            out_collisions[chunkId] = subgroup_bits;
        }
    }
}