// Prefix sum
// Source: https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda
// TODO implement "avoiding bank conflicts"

//@group(0) @binding(0) var<storage, read> a: array<u32>;  // Input  (from A...)
//@group(0) @binding(1) var<storage, write> b: array<u32>; // Output (...to B  )

 // Input buffer
@group(0) @binding(0) var<storage, read_write> b: array<u32>;
@group(0) @binding(1) var<storage, read> b_max: array<u32>;

// Workgroup buffer, with the sum of all input values of a workgroup
@group(0) @binding(2) var<storage, read_write> wgSum: array<u32>;
@group(0) @binding(3) var<storage, read_write> wgMax: array<u32>;

// Uniform
@group(0) @binding(4) var<uniform> useMaxInputU32: u32;

const WORKGROUP_SIZE = 256u;
const TEMP_SIZE = 512u;

// Local (workgroup) buffers
// Twice the workgroup size because each thread will take care of 2 elements in the buffer
var<workgroup> wg_sum: array<u32, TEMP_SIZE>;
var<workgroup> wg_max: array<u32, TEMP_SIZE>;

// MAIN CODE -----------------------------------------------------------------------------------------------------------

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>) {

    let tid1: u32 = 2u * global_id.x; // Global address #1
    let tid2: u32 = tid1 + 1u;        // Global address #2

    let gid: u32 = local_id.x;
    let gid1: u32 = 2u * gid;        // Local workgroup ID #1
    let gid2: u32 = gid1 + 1u;       // Local workgroup ID #2

    let n: u32 = arrayLength(&b);        // Size of the buffer
    var offset: u32 = 1u;

    let useMaxInput: bool = useMaxInputU32 > 0u;

    // Load input into workgroup memory
    if (tid2 < n) {
        let v1 = b[tid1];
        let v2 = b[tid2];
        wg_sum[gid1] = v1;
        wg_sum[gid2] = v2;
        if (useMaxInput) {
            wg_max[gid1] = b_max[tid1];
            wg_max[gid2] = b_max[tid2];
        } else {
            wg_max[gid1] = v1;
            wg_max[gid2] = v2;
        }

    // Or write zero when out of bounds
    } else if (tid1 < n) {
        let v1 = b[tid1];
        wg_sum[gid1] = v1;
        wg_sum[gid2] = 0u;
        if (useMaxInput) {
            wg_max[gid1] = b_max[tid1];
        } else {
            wg_max[gid1] = v1;
        }
        wg_max[gid2] = 0u;
    } else {
        wg_sum[gid1] = 0u;
        wg_sum[gid2] = 0u;
        wg_max[gid1] = 0u;
        wg_max[gid2] = 0u;
    }

    let lastElem = wg_sum[gid2];

    // Build sum in place UP the tree
    for (var d = TEMP_SIZE >> 1u; d > 0u; d = d >> 1u) {
        workgroupBarrier();
        if (gid < d) {
            let ai = offset * (gid1 + 1u) - 1u;
            let bi = offset * (gid2 + 1u) - 1u;
            wg_sum[bi] = wg_sum[bi] + wg_sum[ai];     // Increment
            wg_max[bi] = max(wg_max[bi], wg_max[ai]); // Get maximum
        }
        offset = offset * 2u;
    }

    // Clear the last element
    if (gid == 0u) {
        wg_sum[TEMP_SIZE - 1u] = 0u;
    }

    // Traverse DOWN tree and build scan
    for (var d = 1u; d < TEMP_SIZE; d = d * 2u) {
        offset = offset >> 1u;
        workgroupBarrier();
        if (gid < d) {
            let ai = offset * (gid1 + 1u) - 1u;
            let bi = offset * (gid2 + 1u) - 1u;
            let ta = wg_sum[ai];  // Swap
            let tb = wg_sum[bi];  // Swap
            wg_sum[ai] = tb;      // Swap
            wg_sum[bi] = tb + ta; // Swap with addition!
        }
    }

    // Write results to output buffer (or don't; when out of bounds)
    workgroupBarrier();
    if (tid2 < n) {
        b[tid1] = wg_sum[gid1];
        b[tid2] = wg_sum[gid2];
    } else if (tid1 < n) {
        b[tid1] = wg_sum[gid1];
    }

    if (gid2 == TEMP_SIZE - 1u) {
        wgSum[workgroup_id.x] = wg_sum[gid2] + lastElem;
        wgMax[workgroup_id.x] = wg_max[gid2];
    }
}