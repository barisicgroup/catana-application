import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";

import code from "./src/fill.wgsl";

/**
 * Simple fill shader that sets all elements of the input buffer to a uniform scalar value.
 */
class WgCompFillShader extends WgCompShader {

    private readonly dataBuffer: WgBuffer<Uint32Array>;
    private readonly valueBuffer: WgBuffer<Uint32Array>
    private readonly outputBuffer?: WgBuffer<Uint32Array>;
    private readonly outputOffset?: number;

    private readonly ownsValueBuffer: boolean;

    /**
     * @param context The WebGPU context
     * @param dataBuffer The buffer to be filled
     * @param value The value that will replace every element of the input buffer
     * @param output The output buffer and offset (useful for debugging)
     */
    public constructor(context: WgContext, dataBuffer: WgBuffer<Uint32Array>, value: number | WgBuffer<Uint32Array>, output?: WgBuffer<Uint32Array> | { buffer: WgBuffer<Uint32Array>, offset?: number} ) {

        const valueBuffer = typeof value === "number"
            ? WgBuffer.createUniform(context, Uint32Array, new Uint32Array([value]))
            : value;
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: valueBuffer },
                { binding: 1, buffer: dataBuffer }
            ]
        }];

        super(context, code, buffers);

        this.dataBuffer = dataBuffer;

        this.ownsValueBuffer = typeof value === "number";
        this.valueBuffer = valueBuffer;

        if (output instanceof WgBuffer) {
            this.outputBuffer = output;
        } else if (output) {
            this.outputBuffer = output.buffer;
            this.outputOffset = output.offset;
        }
    }

    public get outputs() {
        if (!this.outputBuffer) return [];
        return [{
            src: this.dataBuffer, srcOffset: 0,
            dst: this.outputBuffer, dstOffset: this.outputOffset || 0,
            byteSize: this.dataBuffer.byteSize
        }];
    }

    public get dispatchSize(): [number, number, number] {
        return [Math.ceil(this.dataBuffer.shape[0] / 256), 1, 1];
    }

    public get workgroupSize(): [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        if (this.ownsValueBuffer) this.valueBuffer.dispose();
    }
}

export default WgCompFillShader;