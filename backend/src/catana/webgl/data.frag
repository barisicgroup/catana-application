uniform float index;

varying vec3 worldPos;
uniform bool useWorldPos;

uniform vec3 data;

void main() {
    gl_FragColor = vec4(index, useWorldPos ? worldPos : data);
}