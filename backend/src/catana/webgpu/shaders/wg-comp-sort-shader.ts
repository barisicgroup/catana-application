import code from "./src/sort.wgsl";

import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";

interface WgCompSortShaderBuffers {
    perElem_binId: WgBuffer<Uint32Array>,
    perBin_elemCount_scan: WgBuffer<Uint32Array>,
    bin_maxElemCount: WgBuffer<Uint32Array>,
    perElem_elemId_sorted: WgBuffer<Uint32Array>
}

/**
 * Sorts element/atom data based on their position in a grid. See constructor for more details
 */
class WgCompSortShader extends WgCompShader {

    private readonly inputBuffers: WgCompSortShaderBuffers;
    private readonly outputBuffer?: WgBuffer<Uint32Array>;
    private readonly outputBufferOffset?: number;

    /**
     * @param context The WebGPU context
     * @param inputBuffers The input buffers:
     *                     - perElem_binId:         The bin/cell index of an element/atom in the grid
     *                                              (see WgCompGridAssignShader)
     *                     - perBin_elemCount_scan: The scan/prefix-sum of the element/atom count of each bin/cell of
     *                                              the grid (see WgCompScanShader)
     *                     - bin_maxElemCount:      The number of elements/atoms of the grid bin/cell with the most
     *                                              elements/atoms (see WgCompScanShader, it also calculates the max)
     *                     - perElem_elemId_sorted: The output of this shader. It contains, for each element/atom, their
     *                                              new index so that they become sorted. (see WgCompMapXyzShader for
     *                                              their actual sorting)
     * @param outputBuffer The output buffer (useful for debugging)
     * @param outputBufferOffset The output offset (useful for debugging)
     */
    public constructor(context: WgContext,
                       inputBuffers: WgCompSortShaderBuffers,
                       outputBuffer?: WgBuffer<Uint32Array>, outputBufferOffset?: number) {
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: inputBuffers.perElem_binId },
                { binding: 1, buffer: inputBuffers.perBin_elemCount_scan },
                { binding: 2, buffer: inputBuffers.bin_maxElemCount },
                { binding: 3, buffer: inputBuffers.perElem_elemId_sorted },
            ]
        }];
        super(context, code, buffers);
        this.inputBuffers = inputBuffers;
        this.outputBuffer = outputBuffer;
        this.outputBufferOffset = outputBufferOffset;
    }

    public get outputs() {
        if (!this.outputBuffer) return [];
        return [{
            src: this.inputBuffers.perElem_elemId_sorted,
            srcOffset: 0,
            dst: this.outputBuffer,
            dstOffset: this.outputBufferOffset || 0,
            byteSize: this.inputBuffers.perElem_elemId_sorted.byteSize
        }];
    }

    public get dispatchSize(): readonly [number, number, number] {
        return [Math.ceil(this.inputBuffers.perElem_binId.shape[0] / 256), 1, 1];
    }

    public get workgroupSize(): readonly [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        // Do nothing :)
    }
}

export default WgCompSortShader;