import code from "./src/add.wgsl";

import WgCompShader from "./wg-comp-shader";
import WgContext from "../wg-context";
import WgBuffer from "../wg-buffer";

/**
 * A shader that adds one or multiple ADDENDs to an INPUT.
 * The addend can have multiple forms. See the constructor for more details
 */
class WgCompAddShader extends WgCompShader {

    private readonly input: WgBuffer<Uint32Array>;
    private readonly addend: WgBuffer<Uint32Array>;
    private readonly blockSize: WgBuffer<Uint32Array>;

    private readonly output?: WgBuffer<Uint32Array>;
    private readonly outputOffset?: number;

    private readonly ownsAddendBuffer: boolean;

    /**
     * @param context The WebGPU context
     * @param input The INPUT to which the ADDEND will be added
     * @param addend The ADDEND. This can have multiple forms:
     *               - A scalar value: Every value in the INPUT will be incremented by this value
     *               - Multiple values: The values of INPUT will be increment by the values passed here in a block-wise
     *                                  manner. This will depend on the value passed on 'blockSize'. See the description
     *                                  of that parameter for more details
     * @param blockSize The size of each addition block. A block is a section of the INPUT data that will be incremented
     *                  by the same value contained in the ADDEND buffer.
     *                  Example:
     *                  - The 1st n=blockSize elements (i.e. range [0,blockSize)) of INPUT will be incremented by the 1st ADDEND value
     *                  - The next n=blockSize elements (i.e. range [blockSize,2*blockSize)) of INPUT will be incremented by the 2nd ADDEND value
     *                  - The next n=blockSize elements (i.e. range [2*blockSize,3*blockSize)) of INPUT will be incremented by the 3rd ADDEND value
     *                  - And so on...
     *                  If 'blockSize' is undefined, it will be automatically calculated to span the entire INPUT range
     *                  as uniformly as possible: blockSize = ceil( len(INPUT) / len(ADDEND) ); where len() gives the
     *                  number of elements of INPUT and ADDEND
     * @param output If provided, the output buffer of this shader (useful for debugging)
     * @param outputOffset If provided, the offset of the output buffer (useful for debugging)
     */
    constructor(context: WgContext,
                input: WgBuffer<Uint32Array>,
                addend: WgBuffer<Uint32Array> | number | Uint32Array,
                blockSize?: number,
                output?: WgBuffer<Uint32Array>,
                outputOffset?: number) {

        let ownsAddendBuffer: boolean;
        if (typeof addend === "number") {
            if (addend !== Math.floor(addend)) {
                console.warn("Decimal number passed where unsigned integer was expected." +
                    " Rounding " + addend + " to " + Math.floor(addend));
            }
            addend = new Uint32Array([Math.floor(addend)]);
        }
        if (addend instanceof Uint32Array) {
            addend = WgBuffer.createStorage(context, [addend.length, 1, 1], Uint32Array, addend, []);
            ownsAddendBuffer = true;
        } else {
            ownsAddendBuffer = false;
        }

        blockSize = blockSize || Math.ceil(input.shape[0] / addend.shape[0]);
        console.assert(Math.ceil(input.shape[0] / blockSize) === addend.shape[0]);
        const blockSizeBuffer = WgBuffer.createUniform(context, Uint32Array, new Uint32Array([blockSize]));

        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: input },
                { binding: 1, buffer: addend },
                { binding: 2, buffer: blockSizeBuffer }
            ]
        }];

        super(context, code, buffers);


        this.input = input;
        this.addend = addend;
        this.blockSize = blockSizeBuffer;
        this.output = output;
        this.outputOffset = outputOffset;
        this.ownsAddendBuffer = ownsAddendBuffer;
    }

    public get outputs() {
        if (!this.output) return [];
        return [{
            src: this.input,
            srcOffset: 0,
            dst: this.output,
            dstOffset: this.outputOffset || 0,
            byteSize: this.input.byteSize
        }];
    }

    public get dispatchSize(): readonly [number, number, number] {
        return [Math.ceil(this.input.shape[0] / 256), 1, 1];
    }

    public get workgroupSize(): readonly [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        if (this.ownsAddendBuffer) this.addend.dispose();
        this.blockSize.dispose();
    }
}

export default WgCompAddShader;