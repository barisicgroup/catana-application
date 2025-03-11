#if !defined(MODE_NONE)
#error "Please define MODE_NONE before compiling this shader"
#elif !defined(MODE_COMPONENT)
#error "Please define MODE_COMPONENT before compiling this shader"
#elif !defined(MODE_REPRESENTATION)
#error "Please define MODE_REPRESENTATION before compiling this shader"
#elif !defined(MODE_PICKING)
#error "Please define MODE_PICKING before compiling this shader"
#elif !defined(MODE_EVERYTHING)
#error "Please define MODE_EVERYTHING before compiling this shader"
#endif

varying vec2 texCoord;

uniform sampler2D idsTex;

uniform sampler2D selectedIdsBuffer;
uniform int selectedIdsBufferSize;
uniform int selectedIdsCount;

uniform int mode;

const vec4 COLOR_SELECTED = vec4(1.0, 0.0, 0.0, 0.0);
const vec4 COLOR_NOT_SELECTED = vec4(0.0, 0.0, 0.0, 0.0);

#define SELECT {gl_FragColor = COLOR_SELECTED; return;}
#define IGNORE {gl_FragColor = COLOR_NOT_SELECTED; return;}

bool match(float a, float b) {
    return abs(a - b) < 0.5 / 255.0;
}

bool match(vec4 a, vec4 b) {
    return all(lessThan(abs(a - b), vec4(0.5 / 255.0)));
}

void main() {
    if (mode == MODE_NONE) IGNORE;

    vec4 picking = texture(idsTex, texCoord); /// RGB is the id (pid), A is the instance (oid)
    float targetOid = picking.a;
    if (targetOid == 0.0) IGNORE;

    if (mode == MODE_EVERYTHING) {
        SELECT;
    }

    float bufSizeMul = 1.0 / float(selectedIdsBufferSize);
    int j = 0;
    for (int i = 0; j < selectedIdsCount; ++i) {
        vec4 selection = texture(selectedIdsBuffer, vec2((float(i) + 0.5) * bufSizeMul, 0.5));

        vec3 selColor;
        float oid;

        switch (mode) {
            case MODE_PICKING:

                oid = selection.g;
                selColor = unpackColor(selection.r);
                if (match(picking, vec4(selColor, oid))) SELECT;

                if (++j >= selectedIdsCount) IGNORE;
                oid = selection.a;
                selColor = unpackColor(selection.b);
                if (match(picking, vec4(selColor, oid))) SELECT;

                ++j;
                break;

            case MODE_REPRESENTATION:
            case MODE_COMPONENT:
                for (int k = 0; k < 4; ++k) {
                    if (j++ >= selectedIdsCount) IGNORE;
                    oid = selection[k];
                    if (match(oid, targetOid)) SELECT;
                }

                break;
        }
    }

    IGNORE;
}