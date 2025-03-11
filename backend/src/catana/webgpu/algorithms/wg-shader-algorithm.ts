import WgGenericAlgorithm from "./wg-generic-algorithm";
import WgContext from "../wg-context";
import WgPass from "../wg-pass";
import WgCompShader from "../shaders/wg-comp-shader";

/**
 * A shader algorithm that takes a WgCompShader in the constructor, executes it,
 * and copies its output into the output buffers (which are provided upon constructing the WgCompShader)
 */
class WgShaderAlgorithm extends WgGenericAlgorithm {
    public constructor(context: WgContext, compShader: WgCompShader, debug?: string) {
        super(context, [], debug);

        this.passes.push(WgPass.createCompShaderPass(context, compShader));
        for (const o of compShader.outputs) {
            this.passes.push(WgPass.createCopyPass(context, o.src, o.dst, o.srcOffset, o.dstOffset, o.byteSize));
        }
    }
}

export default WgShaderAlgorithm;