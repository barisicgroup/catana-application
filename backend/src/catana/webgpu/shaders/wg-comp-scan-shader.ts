import code from "./src/scan.wgsl";

import WgCompShader from "./wg-comp-shader";
import WgBuffer, {BufferFeature} from "../wg-buffer";
import WgContext from "../wg-context";

interface WgCompScanShaderInputBuffers {
    readonly inputDataBuffer: WgBuffer<Uint32Array>;
    readonly inputMaxBuffer?: WgBuffer<Uint32Array>;
    readonly reducedMaxBuffer?: WgBuffer<Uint32Array>;
    readonly reducedSumBuffer?: WgBuffer<Uint32Array>;
}

interface WgCompScanShaderOutputBuffers {
    readonly perElement_workgroupWisePrefixSum?: WgBuffer<Uint32Array>;
    readonly perElement_workgroupWisePrefixSum_offset?: number;

    readonly perWorkgroup_elementSum?: WgBuffer<Uint32Array>;
    readonly perWorkgroup_elementSum_offset?: number;

    readonly perWorkgroup_elementMax?: WgBuffer<Uint32Array>;
    readonly perWorkgroup_elementMax_offset?: number;
}

/**
 * Scan (prefix-sum) shader that computes the prefix-sum of a given buffer IN PLACE. This means that the values of the
 * given/input buffer will be REPLACED by its scan.
 * Additionally, this shader also finds the max (largest value) in the input buffer.
 *
 * WARNING: The scan (and also the largest value) is calculated only PER WORKGROUP and NOT for the entire buffer.
 * Example: If the input buffer has 30 elements and each workgroup has 10 elements, the output scan buffer will look
 *          like this (in Javascript-inspired pseudocode):
 *          - [...scan(0,9), ...scan(10,19), ...scan(20,29)] - where scan() gives an array with the prefix sum of the
 *                                                             elements in the given range
 *
 *          This shader will also output reduced SUM and MAX buffers. In the same example with 30 elements and workgroup
 *          size of 10, they will both have 3 elements and will look like this:
 *          - Sum buffer: [sum(0,9), sum(10,19), sum(20,29)] - where sum() gives the sum of the elements in the given range
 *          - Max buffer: [max(0,9), max(10,19), max(20,29)] - where max() gives the max of the elements in the given range
 *
 *          In order to get the full scan/prefix-sum of the input array, further iterations of this shader are required,
 *          followed by additions (see WgCompAddShader). One more iteration of the example with 30 elements and
 *          workgroup size of 10 will look like this:
 *          - Input buffer: same as reduced Sum buffer shown above: [sum(0,9), sum(10,19), sum(20,29)] <- now only 3
 *                                                                                                        elements, but
 *                                                                                                        workgroup size
 *                                                                                                        of 10 remains
 *                                                                                                        the same
 *          - Sum buffer: [sum(0,29)] <- now only 1 element
 *          - Max buffer: [max(0,29)] <- now only 1 element
 *
 *          The max buffer now contains the largest value in the entire 30-element input buffer.
 *          The sum buffer now contains the sum of all values in the entire 30-element input buffer.
 *
 *          To finish the scan, we now need to work our way up and add the sum (see WgCompAddShader and WgScanAlgorithm)
 *          - 1-element Sum buffer can be discarded
 *          - 3-element Sum-buffer is added into the 30-element scan like so:
 *            add(
 *                 input      =  [...scan(0,9), ...scan(10,19), ...scan(20,29)],  <-  length 30
 *                 addend     =  [sum(0,9), sum(10,19), sum(20,29)],              <-  length 3
 *                 blockSize  =  10                                               <-  same as workgroup size
 *            );
 *
 *          After this step, the scan will be completed: it will be calculated for the entire input buffer.
 *          Additionally, the sum of the entire input buffer will be available in the final 1-element Sum buffer,
 *          and the max value of the entire input buffer will also be available in the final 1-element Max buffer.
 *
 *          This entire pipeline/algorithm is implemented in WgScanAlgorithm
 *
 * Based on this article:
 * https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda
 */
class WgCompScanShader extends WgCompShader {

    private readonly inputs: {
        readonly inputDataBuffer: WgBuffer<Uint32Array>,
        readonly inputMaxBuffer: WgBuffer<Uint32Array>,
        readonly reducedSumBuffer: WgBuffer<Uint32Array>,
        readonly reducedMaxBuffer: WgBuffer<Uint32Array>
    };

    private readonly _useMaxInput: WgBuffer<Uint32Array>;

    private readonly outputBuffers?: WgCompScanShaderOutputBuffers;

    private readonly ownedBuffers: WgBuffer<any>[];

    public static readonly WORKGROUP_SIZE: number = 256;
    public static readonly REDUCED_BLOCK_SIZE: number = 512;

    /**
     * @param context The WebGPU context
     * @param input The input buffer or buffers.
     *              Providing only a buffer here is the same as providing it like this: { inputDataBuffer: buffer }.
     *
     *              inputDataBuffer:  The input data where the scan will be performed (WARNING: workgroup-wise! see class
     *                                                                                 description for more details)
     *                                The output/reduced sum buffer will be based on the contents of this buffer.
     *                                If 'inputMaxBuffer' is NOT provided, the output/reduced max buffer will also be
     *                                                                     based on the contents of this buffer.
     *
     *              inputMaxBuffer:   If provided, the output/reduced max buffer will be based on the contents of this
     *                                buffer. Otherwise, they will be based on 'inputDataBuffer'
     *
     *              reducedSumBuffer: If provided, the output/reduced sum values will be stored here.
     *                                Otherwise, a new buffer will be created to store these values.
     *
     *              reducedMaxBuffer: If provided, the output/reduced max values will be stored here.
     *                                Otherwise, a new buffer will be created to store these values.
     *
     * @param outputBuffers The output buffers and offsets (useful for debugging)
     */
    public constructor(context: WgContext,
                       input: WgBuffer<Uint32Array> | WgCompScanShaderInputBuffers,
                       outputBuffers?: WgCompScanShaderOutputBuffers) {

        // Set up input buffers
        if (input instanceof WgBuffer)  input = { inputDataBuffer: input };
        const wgb_shape: readonly [number, number, number] = [WgCompScanShader.calculateNumWorkgroups(input.inputDataBuffer.shape[0]), 1, 1];
        const sumCopiable: boolean = !!(outputBuffers && outputBuffers.perWorkgroup_elementSum);
        const maxCopiable: boolean = !!(outputBuffers && outputBuffers.perWorkgroup_elementMax);
        const sumFeats = sumCopiable ? [BufferFeature.COPIABLE] : [];
        const maxFeats = maxCopiable ? [BufferFeature.COPIABLE] : [];
        const inputs = {
            inputDataBuffer: input.inputDataBuffer,
            inputMaxBuffer: input.inputMaxBuffer || WgBuffer.createEmptyStorage(context, [1, 1, 1], Uint32Array, [], "inputMaxBuffer"), // Dummy
            reducedMaxBuffer: input.reducedMaxBuffer || WgBuffer.createEmptyStorage(context, wgb_shape, Uint32Array, maxFeats, "reducedMaxBuffer"),
            reducedSumBuffer: input.reducedSumBuffer || WgBuffer.createEmptyStorage(context, wgb_shape, Uint32Array, sumFeats, "reducedSumBuffer")
        };
        const useMaxInput = WgBuffer.createUniform(context, Uint32Array, new Uint32Array([input.inputMaxBuffer ? 1 : 0]));

        // Set up buffers
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: inputs.inputDataBuffer },
                { binding: 1, buffer: inputs.inputMaxBuffer },
                { binding: 2, buffer: inputs.reducedSumBuffer },
                { binding: 3, buffer: inputs.reducedMaxBuffer },
                { binding: 4, buffer: useMaxInput }
            ]
        }];

        // Initialize
        super(context, code, buffers);

        this.ownedBuffers = [];
        this.inputs = inputs;
        this._useMaxInput = useMaxInput;


        // Save owned buffers for later disposal
        this.ownedBuffers.push(this._useMaxInput);
        if (!input.inputMaxBuffer) this.ownedBuffers.push(this.inputs.inputMaxBuffer);
        if (!input.reducedMaxBuffer) this.ownedBuffers.push(this.inputs.reducedMaxBuffer);
        if (!input.reducedSumBuffer) this.ownedBuffers.push(this.inputs.reducedSumBuffer);

        console.assert(this.inputs.reducedMaxBuffer.length === this.inputs.reducedSumBuffer.length);

        this.outputBuffers = outputBuffers;
    }

    public static calculateNumWorkgroups(numElements: number) {
        // Divide by 2 because each thread will take care of 2 elements in the buffer
        return Math.ceil(numElements / (2 * this.WORKGROUP_SIZE));
    }

    public get reducedSumBuffer(): WgBuffer<Uint32Array> {
        return this.inputs.reducedSumBuffer;
    }

    public get reducedMaxBuffer(): WgBuffer<Uint32Array> {
        return this.inputs.reducedMaxBuffer;
    }

    public get outputs() {
        if (!this.outputBuffers) return [];
        const outputs = [];
        if (this.outputBuffers.perElement_workgroupWisePrefixSum) {
            outputs.push({
                src: this.inputs.inputDataBuffer,
                srcOffset: 0,
                dst: this.outputBuffers.perElement_workgroupWisePrefixSum,
                dstOffset: this.outputBuffers.perElement_workgroupWisePrefixSum_offset || 0,
                byteSize: this.inputs.inputDataBuffer.byteSize
            });
        }
        if (this.outputBuffers.perWorkgroup_elementSum) {
            outputs.push({
                src: this.inputs.reducedSumBuffer,
                srcOffset: 0,
                dst: this.outputBuffers.perWorkgroup_elementSum,
                dstOffset: this.outputBuffers.perWorkgroup_elementSum_offset || 0,
                byteSize: this.inputs.reducedSumBuffer.byteSize
            });
        }
        if (this.outputBuffers.perWorkgroup_elementMax) {
            outputs.push({
                src: this.inputs.reducedMaxBuffer,
                srcOffset: 0,
                dst: this.outputBuffers.perWorkgroup_elementMax,
                dstOffset: this.outputBuffers.perWorkgroup_elementMax_offset || 0,
                byteSize: this.inputs.reducedMaxBuffer.byteSize
            });
        }
        return outputs;
    }

    public get dispatchSize() {
        return this.inputs.reducedSumBuffer.shape;
    }

    public get workgroupSize(): [number, number, number] {
        return [WgCompScanShader.WORKGROUP_SIZE, 1, 1];
    }

    public dispose() {
        for (const b of this.ownedBuffers) b.dispose();
        this.ownedBuffers.length = 0;
    }
}

export default WgCompScanShader;