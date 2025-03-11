import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";

import code from "./src/map-xyz.wgsl";
import WgContext from "../wg-context";

interface WgCompMapXyzShaderInputs {
    in_xyzcr: WgBuffer<Float32Array>;
    indices: WgBuffer<Uint32Array>;
    out_xyzcr: WgBuffer<Float32Array>;
    in_bonds: WgBuffer<Uint32Array>;
    out_bonds: WgBuffer<Uint32Array>;
}

interface WgCompMapXyzShaderOutputs {
    xyzcr?: WgBuffer<Float32Array>;
    xyzcrOffset?: number;
}

/**
 * Maps some vec4<f32> data into another buffer at the provided index. See constructor for more details
 */
class WgCompMapXyzShader extends WgCompShader {

    private readonly _inputs: WgCompMapXyzShaderInputs;
    private readonly _outputs?: WgCompMapXyzShaderOutputs;

    /**
     * @param context The WebGPU context
     * @param inputs The input buffers:
     *               - in_xyzcr:   The input data to be mapped into a separate buffer
     *               - out_xyzcr:  The output buffer that will contain the same data as 'in_xyzcr' but mapped into
     *                             different indexes (the new indexes are provided in the 'indices' buffer)
     *               - indices:    The new indices of 'in_xyzcr' in 'out_xyzcr.
     *                             Each value 'id_i' at position 'i' of this buffer represents the index in output.
     *                             Like this:
     *                             - in_xyzcr  has value       'v'     at position 'i'
     *                             - indices   has value       'i_out' at position 'i'
     *                             - out_xyzcr will have value 'v'     at position 'i_out'
     *                - in_bonds:  The input bond data, which will be mapped just like 'in_xyzcr'
     *                             See WgCompCollisionGlobalShader's constructor for a detailed description
     *                - out_bonds: The output bond data, which is mapped just like 'out_xyzcr'
     * @param outputs The output buffer and offset (useful for debugging)
     */
    public constructor(context: WgContext, inputs: WgCompMapXyzShaderInputs, outputs?: WgCompMapXyzShaderOutputs) {
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: inputs.indices },
                { binding: 1, buffer: inputs.in_xyzcr },
                { binding: 2, buffer: inputs.out_xyzcr },
                { binding: 3, buffer: inputs.in_bonds },
                { binding: 4, buffer: inputs.out_bonds }
            ]
        }];
        super(context, code, buffers);
        this._inputs = inputs;
        this._outputs = outputs;
    }

    public get outputs() {
        if (!this._outputs || !this._outputs.xyzcr) return [];
        /*const outputs = [];
        const ins = [this._inputs.outx, this._inputs.outy, this._inputs.outz, this._inputs.outc];
        const outs = [this._outputs.x, this._outputs.y, this._outputs.z, this._outputs.c];
        const offsets = [this._outputs.xOffset, this._outputs.yOffset, this._outputs.zOffset, this._outputs.cOffset];
        for (let i = 0; i < 3; ++i) {
            const out = outs[i];
            if (!out) continue;
            outputs.push({
                src: ins[i], srcOffset: 0,
                dst: out, dstOffset: offsets[i] || 0,
                byteSize: ins[i].byteSize
            });
        }
        return outputs;*/
        return [{
            src: this._inputs.out_xyzcr, srcOffset: 0,
            dst: this._outputs.xyzcr, dstOffset: this._outputs.xyzcrOffset || 0,
            byteSize: this._inputs.in_xyzcr.byteSize
        }];
    }

    public get dispatchSize(): [number, number, number] {
        return [Math.ceil(this._inputs.indices.shape[0] / 256), 1, 1];
    }

    public get workgroupSize(): [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        // Do nothing :)
    }
}

export default WgCompMapXyzShader;