// Unsort
// Maps a binary collision buffer into another one using an 'indices' buffer

@group(0) @binding(0) var<storage, read> in_collisions: array<u32>;
@group(0) @binding(1) var<storage, read> indices: array<u32>;
@group(0) @binding(2) var<storage, read_write> out_collisions: array< atomic<u32> >;

const ONE_OVER_256: f32 = 0.00390625f;
const ONE_OVER_32: f32 = 0.03125f;
const ONE_OVER_8: f32 = 0.125f;
var<workgroup> wg: array<u32, 8>; // = WORKGROUP_SIZE / 32

// MAIN CODE -----------------------------------------------------------------------------------------------------------

@compute @workgroup_size(256)
fn main(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>) {

    let numElems = u32(arrayLength(&indices));
    let numChunks = u32(arrayLength(&in_collisions));

    let tid = global_id.x; // Thread ID
    let gid = local_id.x; // Thread ID within workgroupread_write

    let subgroup_id: u32 = u32(floor(f32(gid) * ONE_OVER_32)); // 0 -> 7
    let sid: u32 = 31u - (gid % 32u); // 31 -> 0
    let bit = 1u << sid;

    if (gid < 8u) {
        let i = (workgroup_id.x * 8u) + gid;
        if (i < numChunks) {
            wg[gid] = in_collisions[i];
        } else {
            wg[gid] = 0u;
        }
        atomicStore(&out_collisions[i], 0u);
    }

    workgroupBarrier();

    if (tid < numElems) {
        let value = wg[subgroup_id] & bit;
        if (value > 0u) {
            // MAP:
            // let i = indices[tid];
            // out_xyzc[tid] = in_xyzc[i];
            // ...now we wanna do the inverse!
            let i = indices[tid];

            let new_chunk_id: u32 = u32(floor(f32(i) * ONE_OVER_32)); // 0 -> n/32
            let new_chunk = &out_collisions[new_chunk_id];
            let new_sid: u32 = 31u - (i % 32u); // 31 -> 0
            let new_bit: u32 = 1u << new_sid;
            atomicOr(new_chunk, new_bit);
        }
    }
}