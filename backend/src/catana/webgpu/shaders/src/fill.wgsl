@group(0) @binding(0) var<uniform> value: u32;
@group(0) @binding(1) var<storage, read_write> data: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    // Guard against out-of-bounds work group sizes
    if (global_id.x >= u32(arrayLength(&data))) {
        return;
    }
    data[global_id.x] = value;
}