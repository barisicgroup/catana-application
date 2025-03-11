// Counting sort
// Sources:
// - https://www.tutorialandexample.com/counting-sort-in-ds
// - https://on-demand.gputechconf.com/gtc/2014/presentations/S4117-fast-fixed-radius-nearest-neighbor-gpu.pdf

@group(0) @binding(0) var<storage, read> perElem_id: array<u32>;
@group(0) @binding(1) var<storage, read> perBin_elemCount_scan: array<u32>;
@group(0) @binding(2) var<storage, read> bin_maxElemCount: u32;
@group(0) @binding(3) var<storage, read_write> perElem_elemId_sorted: array< atomic<u32> >; // Initially filled with U32_MAX // TODO make this the maximum array size too :)

const WORKGROUP_SIZE = u32(256);
const SUBGROUP_SIZE = u32(32);
const U32_MAX: u32 = 0xffffffffu;

// Local (workgroup) buffers
var<workgroup> wg: array<atomic<u32>, 8>; // = WORKGROUP_SIZE / SUBGROUP_SIZE
var<workgroup> wg_done: atomic<u32>;

// MAIN CODE -----------------------------------------------------------------------------------------------------------

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let numElems = u32(arrayLength(&perElem_id));
    let tid = global_id.x; // Thread ID

    let gid = local_id.x;  // (work)Group ID

    if (gid < 8u) { // = WORKGROUP_SIZE / SUBGROUP_SIZE
        atomicStore(&wg[gid], 0u); // Initialize all subgroup binary "done" u32s
    }

    workgroupBarrier();

    let subgroup_id: u32 = u32(floor((f32(gid) / f32(SUBGROUP_SIZE))));
    let sid: u32 = gid % SUBGROUP_SIZE;
    let subgroup_done = &wg[subgroup_id];

    if (gid == WORKGROUP_SIZE - 1u) {
        atomicStore(&wg_done, U32_MAX); // Initialize the per-workgroup binary "done" u32
    }

    var elem_id = tid;
    var elem_sortedId: u32 = 0u;
    if (elem_id < numElems) {
        let elem_binId = perElem_id[elem_id];
        elem_sortedId = perBin_elemCount_scan[elem_binId];
    } else {
        elem_id = U32_MAX;
        let bit = 1u << sid;
        atomicOr(subgroup_done, bit); // TODO make this better with workgroup reduction
    }

    for (var i = 0u; i < bin_maxElemCount; i = i + 1u) {
        if (elem_id != U32_MAX) {
            // Insert sorted atom ID into output buffer (atomically)
            elem_id = atomicExchange(&perElem_elemId_sorted[elem_sortedId], elem_id);
            if (elem_id == U32_MAX) {
                let bit = u32(1) << sid;
                atomicOr(subgroup_done, bit);
            }
        }

        if (gid == WORKGROUP_SIZE - 1u) {
            atomicStore(&wg_done, U32_MAX); // Reinitialize the per-workgroup binary "done" u32
        }

        workgroupBarrier();

        if (sid == 0u) {
            // This is very delicate
            // Must ensure that the value of wg_done is 0xffffffff before this
            atomicAnd(&wg_done, atomicLoad(subgroup_done));
        }

        elem_sortedId = elem_sortedId + 1u;
    }

    // Done!
}