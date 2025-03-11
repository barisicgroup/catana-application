// CD-PRE-FFRNN
// Collision Detection - Preprocessing - Fast Fixed-Radius Nearest Neighbors

struct ElemData {
    pos: vec3<f32>,
    otherData: u32
}

// Input, per-component group
/* Must not have length > 256, must have same length as in_perComp_atomStart */
//@group(0) @binding(0) var<storage, read> in_perComp_matrix: array< mat4x4<f32> >;
/* Must not have length > 256 must have same length as in_perComp_matrix, must have increasing values (NOT decreasing!) */
//@group(0) @binding(1) var<storage, read> in_perComp_atomStart: array<u32>; // Must not have length > 256

// Input, per-atom group
//@group(0) @binding(2) var<storage, read> in_perAtom_x: array<f32>;
//@group(0) @binding(3) var<storage, read> in_perAtom_y: array<f32>;
//@group(0) @binding(4) var<storage, read> in_perAtom_z: array<f32>;
@group(0) @binding(0) var<storage, read_write> in_perElem_data: array< ElemData >;

// Output group
@group(0) @binding(1) var<storage, read_write> out_perBin_elemCount_atomic: array< atomic<u32> >;
@group(0) @binding(2) var<storage, read_write> out_perElem_binId: array<u32>;
//@group(0) @binding(4) var<storage, write> out_perElem_xyzc: array< vec4<f32> >; // X, Y, Z, component ID

// Other parameters group
struct GridParams {
    gridMin: vec3<f32>, // + f32 padding
    gridMax: vec3<f32>, // + f32 padding
    gridBinSize: vec3<f32> // + f32 padding
};
@group(0) @binding(3) var<uniform> gridParams: GridParams;

struct CompParams {
    transform: mat4x4<f32>,
    elemIdStart: u32,
    elemIdEnd: u32
};
@group(0) @binding(4) var<uniform> compParams: CompParams;

// Local (workgroup) buffers
//var<workgroup> wg_perComp_atomStart: array<u32, 256>;

const U32_MAX = 0xffffffffu;

fn _3d_to_1d(v: vec3<f32>, gridSize: vec3<u32>) -> u32 {
    if (any(v <  gridParams.gridMin)) { return U32_MAX; }
    if (any(v >= gridParams.gridMax)) { return U32_MAX; }

    let i = clamp(vec3<u32>(floor((v - gridParams.gridMin) / gridParams.gridBinSize)), vec3<u32>(0u, 0u, 0u), gridSize);

    return (i.x) + (i.y * gridSize.x) + (i.z * gridSize.x * gridSize.y);
}

// MAIN CODE -----------------------------------------------------------------------------------------------------------

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {

    // Hi! I am atom X. I will be handling everything from now on :)
    let elemId = global_id.x;

    let numElems = u32(arrayLength(&in_perElem_data));
    if (elemId >= numElems) {
        return; // Out of bounds guard
    }

    var data: ElemData = in_perElem_data[elemId];

    let gridSize = vec3<u32>(floor((gridParams.gridMax - gridParams.gridMin) / gridParams.gridBinSize));

    // Find out the atom 3D position and the atom index in the grid
    var elemPos = data.pos;
    let transform: bool = (elemId >= compParams.elemIdStart) & (elemId < compParams.elemIdEnd);
    if (transform) {
        elemPos = (compParams.transform * vec4<f32>(elemPos, 1f)).xyz;
        data.pos = elemPos;
        in_perElem_data[elemId] = data;
    }

    let binId = _3d_to_1d(elemPos, gridSize);
    if (binId == U32_MAX) {
        return; // TODO handle this case better! Like maybe include a outputLength output buffer?
    }

    // Store output values
    atomicAdd(&out_perBin_elemCount_atomic[binId], 1u);
    out_perElem_binId[elemId] = binId;
}