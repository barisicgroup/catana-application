varying vec2 texCoord;

uniform sampler2D binTex;
uniform sampler2D binDepthTex;

uniform vec2 size;

uniform float near;
uniform float far;

uniform vec4 color;

void main() {

    /*vec4 v = texture(binTex, texCoord);
    gl_FragColor = v;
    if (v.a > 0.0) return;*/

    //float d = texture(binDepthTex, texCoord).r;
    //float rd = (d * 2.0) - 1.0;
    //rd = 2.0 * near * far / (far + near - rd * (far - near));
    //if (d > 1.0) {gl_FragColor=vec4(0.0, 1.0, 0.0, 1.0);return;}
    //gl_FragColor = vec4(d, 0.0, 0.0, 1.0);
    //if(far > 0.0) return;

    // Offsets
    float ox = 0.5 / size.x; // Offset X
    float oy = 0.5 / size.y; // Offset Y

    vec4 v1 = texture(binTex, texCoord + vec2(-ox, -oy));
    vec4 v2 = texture(binTex, texCoord + vec2(ox, -oy));
    vec4 v3 = texture(binTex, texCoord + vec2(-ox, oy));
    vec4 v4 = texture(binTex, texCoord + vec2(ox, oy));

    // Binary value
    float bin = v1.a + v2.a + v3.a + v4.a;
    //float bin = texture(binTex, texCoord).r;

    if (bin >= 4.0 || bin <= 0.0) {
        //gl_FragDepthEXT = 1.0;
        discard;

    } else {

        // Depth of binary mask
        /*float d1 = texture(binDepthTex, texCoord + vec2(-ox, -oy)).r;
        float d2 = texture(binDepthTex, texCoord + vec2(-ox, -oy)).r;
        float d3 = texture(binDepthTex, texCoord + vec2(-ox, -oy)).r;
        float d4 = texture(binDepthTex, texCoord + vec2(-ox, -oy)).r;
        float depth_max = max(max(d1, d2), max(d3, d4));*/
        //float depth = texture(binDepthTex, texCoord).r;

        //float realDepth = (depth * 2.0) - 1.0;
        //realDepth = 2.0 * near * far / (far + near - realDepth * (far - near));

        gl_FragColor = color;
        //gl_FragDepthEXT = depth;
    }
}