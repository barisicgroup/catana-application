varying vec2 texCoord;

//uniform sampler2D srcTex; // Source texture
uniform sampler2D selTex; // Selection texture
uniform sampler2D conTex; // Contour texture
uniform bool renderSelection;
uniform bool removeInside;
uniform vec3 selColor;

void main() {
    /*vec4 color = texture(srcTex, texCoord);
    if (renderSelection) {
        bool isOutside = texture(selTex, texCoord).r < 0.5;
        if (isOutside) {
            float alpha = texture(conTex, texCoord).r;
            color = (color * (1.0 - alpha)) + vec4(selColor * alpha, 1.0);
        } else if (!removeInside) {
            color = vec4(selColor, 1.0);
        }
    }
    gl_FragColor = color;*/
    if (renderSelection) {
        bool isOutside = texture(selTex, texCoord).r < 0.5;
        if (isOutside) {
            float alpha = texture(conTex, texCoord).r;
            gl_FragColor = vec4(selColor, alpha);
            return;
        }
    }
    discard;
}