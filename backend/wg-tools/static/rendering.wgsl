struct Uniforms {
    viewProj: mat4x4<f32>,
    right: vec3<f32>,
    radius: f32,
    up: vec3<f32>
}
@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) offset: vec2<f32>
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) offset: vec2<f32>
};

let SQRT2: f32 = 1.41421356237f;

@stage(vertex)
fn vs_main(in: VertexInput) -> VertexOutput {
  let offset: vec3<f32> = ((uniforms.right * in.offset.x) + (uniforms.up * in.offset.y)) * (uniforms.radius * SQRT2);
  //let offset: vec3<f32> = vec3<f32>(in.offset.x, in.offset.y, 0f) * (uniforms.radius * SQRT2);
  var out: VertexOutput;
  out.position = uniforms.viewProj * vec4<f32>(in.position + offset, 1f);
  //out.position = vec4<f32>(in.position + offset, 1f);
  out.offset = in.offset;
  return out;
}

@stage(fragment)
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let length2 = dot(in.offset, in.offset);
  let radius2 = uniforms.radius * uniforms.radius;
  // length * radius < radius * 0.8f
  // length * length < * 0.8f * 0.8f
  if (length2 > 1f || length2 < 0.64f) {
    discard;
  }
  //return vec4<f32>(in.offset.x, in.offset.y, 0f, 1f);
  return vec4<f32>(1f, 0f, 0f, 1f);
}