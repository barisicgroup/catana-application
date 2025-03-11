/// <reference types="@webgpu/types" />

import WgContext from "../wg-context";
import WgBuffer, {BufferFeature} from "../wg-buffer";
import WgCompScanShader from "../shaders/wg-comp-scan-shader";
import WgCompAddShader from "../shaders/wg-comp-add-shader";
import WgPass from "../wg-pass";
import WgGenericAlgorithm from "./wg-generic-algorithm";

/**
 * Implements the scan (a.k.a. prefix-sum) algorithm on WebGPU
 * The scan works per workgroup, so the results of each pass have to be reduced and added.
 * (this WgAlgorithm also find the largest (max) value in the input data)
 *
 * See WgCompScanShader for a thorough explanation with an example.
 *
 * See the following link under Section 39.2.4 - "Arrays of Arbitrary Size"
 * https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda
 */
class WgScanAlgorithm extends WgGenericAlgorithm {

    //private readonly input: WgBuffer<Uint32Array>;
    private readonly output: WgBuffer<Uint32Array>;
    private readonly output_max: WgBuffer<Uint32Array>;

    /**
     * Constructs this WgAlgorithm to perform the scan on the provided array
     * The scan will be available via the function readScan()
     * Additionally, the largest (max) value of the provided array will be available via the function readMax()
     */
    public constructor(context: WgContext, inputArray: Uint32Array, debug?: string) {
        super(context, [], debug);

        const input = WgBuffer.createStorage(context, [inputArray.length, 1, 1], Uint32Array, inputArray, [BufferFeature.COPIABLE], "scanInput");
        const finalMax = WgBuffer.createEmptyStorage(context, [1, 1, 1], Uint32Array, [BufferFeature.COPIABLE], "scanFinalMax");

        this.output = WgBuffer.createOutput(context, [inputArray.length, 1, 1], Uint32Array);
        this.output_max = WgBuffer.createOutput(context, [1, 1, 1], Uint32Array);

        this.passes.push(
            ...WgScanAlgorithm.createPasses(context, input, finalMax),
            WgPass.createCopyPass(context, input, this.output),
            WgPass.createCopyPass(context, finalMax, this.output_max));
    }

    /**
     * Starts a recursive function that creates all necessary passes for a scan, until the data
     * is reduced to a single value. On the way back in the stack, the addition is performed
     * @param context The WebGPU context
     * @param inputData The input data to perform a scan (and max) on
     * @param finalOutputMax A buffer where the max value will be stored.
     *                       If not provided, one will be created automatically and discarded afterwards
     */
    public static createPasses(context: WgContext,
                               inputData: WgBuffer<Uint32Array>,
                               finalOutputMax?: WgBuffer<Uint32Array>): WgPass[] {
        const passes: WgPass[] = [];
        this._createPasses(context, passes, inputData, undefined, finalOutputMax);
        return passes;
    }

    private static _createPasses(context: WgContext,
                                 passes: WgPass[],
                                 inputData: WgBuffer<Uint32Array>,
                                 inputMax?: WgBuffer<Uint32Array>,
                                 finalOutputMax?: WgBuffer<Uint32Array>) {

        const reducedSize = WgCompScanShader.calculateNumWorkgroups(inputData.shape[0]);

        const input = {
            inputDataBuffer: inputData,
            inputMaxBuffer: inputMax,
            reducedMaxBuffer: reducedSize > 1 ? undefined : finalOutputMax,
            reducedSumBuffer: undefined
        };

        // Here's where the magic happens!
        // First: perform the scan (workgroup-wise)
        const scan = new WgCompScanShader(context, input);
        passes.push(WgPass.createCompShaderPass(context, scan));

        // If after the reduction we only have 1 element, there is no need for more passes

        // Otherwise, we scan further!
        if (reducedSize > 1) {
            WgScanAlgorithm._createPasses(context, passes, scan.reducedSumBuffer, scan.reducedMaxBuffer, finalOutputMax); // Recursive!

            // After all the scan have been completed,
            // now we make our way back in the stack,
            // performing additions
            const add = new WgCompAddShader(context, inputData, scan.reducedSumBuffer, WgCompScanShader.REDUCED_BLOCK_SIZE);
            passes.push(WgPass.createCompShaderPass(context, add));
        }
    }

    /**
     * Returns a promise that delivers the resulting scan of the input data
     */
    public async readScan(): Promise<Uint32Array> {
        return this.output.read();
    }

    /**
     * Returns a promise that delivers the largest value in the input data
     */
    public async readMax(): Promise<number> {
        return this.output_max.read(this.output_max.shape[0] - 1, 1).then(v => v[0]);
    }
}

export default WgScanAlgorithm;