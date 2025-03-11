const path = require('path');

export default {
    input: "wg-tools/wg.js",
    output: {
        file: "wg-tools/static/wg.js",
        format: "iife",
        name: "WG"
    },
    plugins: [
        {
            name: "wgsl",
            transform: function(code, id) {
                if (!id.endsWith(".wgsl")) return; // Ignore files that don't end with .wgsl
                const filename = path.basename(id).split(".")[0].replace(/-/g, "_");
                //code = processShaderCode(code);
                code = code.replace(/ +/g, " ");
                return {
                    code: "const " + filename + " = " + JSON.stringify(code) + ";export default " + filename + ";",
                    map: { mappings: "" }
                };
            }
        },
        {
            name: "three",
            transform: function(code, id) {
                if (!id.startsWith("wg-") && !id.endsWith(".js")) return;
                const regExp = /import {.*} from .*["']three["'].*$/gm;
                const matches = code.match(regExp);
                if (!matches) return;
                //code = code.replace(regExp, 'import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";');
                //code = code.replace(regExp, "const THREE = window.WG;");
                code = code.replace(regExp, "");
                for (const m of matches) {
                    const line = m.replace(/ /g, "");
                    const end = line.indexOf("}");
                    if (end === -1) throw "'}' not found";
                    const imports = "(" + line.substring("import{".length, end).replace(/,/g, "|") + ")";
                    console.log("Replacing following imports: " + imports);
                    code = code.replace(new RegExp(imports, "g"), "WG.$1");
                    code = code.replace(/applyWG\.Matrix4/, "applyMatrix4");
                }
                //console.log(code);
                return { code: code, map: { mappings: ""} }
            }
        }
    ]
}