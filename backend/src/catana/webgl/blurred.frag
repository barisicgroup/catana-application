varying vec2 texCoord;

uniform sampler2D srcTex;
uniform bool horizontal;
uniform vec2 texSize;

// Source: https://rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/
const float OFFSET[3] = float[](0.0, 1.3846153846, 3.2307692308);
const float WEIGHT[3] = float[](0.2270270270, 0.3162162162, 0.0702702703);

void main() {
    float value = texture(srcTex, texCoord).r * WEIGHT[0];

    vec2 offsetMul;
    if (horizontal) {
        float mul = 1.0 / texSize.x;
        offsetMul = vec2(mul, 0.0);
    } else {
        float mul = 1.0 / texSize.y;
        offsetMul = vec2(0.0, mul);
    }

    for (int i = 1; i < 3; ++i) {
        vec2 offset = OFFSET[i] * offsetMul;
        float v1 = texture(srcTex, texCoord + offset).r;
        float v2 = texture(srcTex, texCoord - offset).r;
        value += ((v1 + v2) * WEIGHT[i]);
    }

    gl_FragColor = vec4(value, 0.0, 0.0, 0.0);
}