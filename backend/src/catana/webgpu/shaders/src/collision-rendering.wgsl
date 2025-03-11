struct Uniforms {
    viewProj: mat4x4<f32>,
    right: vec3<f32>,
    mode: u32,
    up: vec3<f32>,
    color: u32,
    lenience: f32,
    radius: f32, // (-1): covalent with lenience adjustment | (-2): covalent | >=(0): use float value | else: undefined
    thickness: f32
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> collisions: array<u32>;

struct VertexInput {
    @location(0) position: vec4<f32>,
    @location(1) offset: vec2<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) offset: vec2<f32>,
    @location(1) @interpolate(flat) collides: u32,
    @location(2) @interpolate(flat) radius: f32
};

const SQRT2: f32 = 1.41421356237f;
const ONE_DIV_32: f32 = 0.03125f;
const ONE_DIV_256: f32 = 0.00390625f;

fn branchlessCompareReturn(_cmp: bool, v_true: f32, v_false: f32) -> f32 {
    let cmp: u32 = u32(_cmp);
    let t: f32 = f32(cmp);       // TRUE  multiplier -> gives 1u if cmp, 0u otherwise
    let f: f32 = f32(1u >> cmp); // FALSE multiplier -> gives 0u if cmp, 1u otherwise
    //return bitcast<f32>( bitcast<u32>(t * v_true) | bitcast<u32>(f * v_false) );
    return (t * v_true) + (f * v_false);
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) id: u32) -> VertexOutput {

    // Check collision
    let numBlocks: u32 = arrayLength(&collisions);
    let blockId = u32(f32(id) * ONE_DIV_32);
    let bitId = id % 32u;
    let block = collisions[blockId];
    let bit = block & (0x80000000u >> bitId);
    let collides: u32 = u32(bit != 0u);

    let radiusPm_elemId: u32 = bitcast<u32>(in.position.w);
    let lenience = branchlessCompareReturn(uniforms.radius == -1f, uniforms.lenience * 0.5f, 0f);
    var radius: f32 = max(0f, f32(radiusPm_elemId >> 24u) * 0.01f);
    radius = branchlessCompareReturn(uniforms.radius < 0f, radius - lenience, uniforms.radius);

    // Calculate offset in world space
    let offset: vec3<f32> = ((uniforms.right * in.offset.x) + (uniforms.up * in.offset.y)) * (radius * SQRT2);
    //let offset: vec3<f32> = vec3<f32>(in.offset.x, in.offset.y, 0f) * (uniforms.radius * SQRT2);

    var out: VertexOutput;
    out.position = f32(collides) * (uniforms.viewProj * vec4<f32>(in.position.xyz + offset, 1f));
    //out.position = vec4<f32>(in.position.xyz + vec3<f32>(in.offset, 0f) * 0.125f, uniforms.radius * 0f + 1f);
    out.offset = in.offset;
    out.collides = collides;
    out.radius = radius;
    return out;
}

// A 'marker' function returns true if the XY fragment should be drawn; and false otherwise
fn marker_x(xy: vec2<f32>) -> bool {
    let length2 = dot(xy, xy);
    let radiusCheck = length2 <= 1f;
    let xCheck = abs(abs(xy.x) - abs(xy.y)) < uniforms.thickness;
    return radiusCheck & xCheck;
}
fn marker_o(xy: vec2<f32>) -> bool {
    let length2 = dot(xy, xy);
    let thickness = 1f - uniforms.thickness;
    //let radius2 = radius * radius;
    //return length2 < 1f && length2 > 0.64f;
    let outerCheck = length2 <= 1f;
    let innerCheck = length2 >= (thickness * thickness);
    return outerCheck & innerCheck;
}
fn marker(xy: vec2<f32>, mode: u32) -> bool {
    switch(mode) {
        case 0u: { return marker_o(xy); }
        case 1u: { return marker_x(xy); }
        default: { return true; }
    }
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    //let radiusInPm_mode: u32 = uniforms.radiusInPm_mode;
    //let radius: f32 = f32(radiusInPm_mode >> 16u) * 0.01f * 0f + 1f;
    //let mode: u32 = radiusInPm_mode & 0x0000ffffu;
    let radius: f32 = in.radius;
    let mode: u32 = uniforms.mode;

    if (in.collides == 0u || !marker(in.offset, mode)) {
        discard;
    }

    let color: u32 = uniforms.color;
    let r: f32 = f32( color >> 24u               );
    let g: f32 = f32((color >> 16u) & 0x000000ffu);
    let b: f32 = f32((color >> 8u ) & 0x000000ffu);
    let a: f32 = f32((color       ) & 0x000000ffu);
    return vec4<f32>(r, g, b, a) * ONE_DIV_256;
    //return vec4<f32>(1f, 0f, 0f, 1f);
}