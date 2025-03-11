import code from "./src/unsort.wgsl";

import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";

interface WgCompUnsortShaderInputBuffers {
    in_collisions: WgBuffer<Uint32Array>;
    indices: WgBuffer<Uint32Array>;
    out_collisions: WgBuffer<Uint32Array>;
}

/**
 * "Unsorts" collision data based on an 'indices' buffer.
 *
 * Catana explanation:
 *
 * A 'collisions' buffer is a U32 buffer where each bit encodes whether an element/atom is colliding with another or
 * not. 0 means it does not collide; 1 means it does collide.
 *
 * The way our collision detection algorithm works, the element/atom data is sorted based on which cell they live in in
 * the grid. This sorting is done based on an 'indices' buffer, where a value 'vi' in position 'i' represents the index
 * where the element/atom 'ai' in position 'i' should be placed on. So atom 'ai' will end up in position 'vi'
 *
 * The output 'collisions' buffer of our collision detection algorithm is therefore aligned with the SORTED indexes
 * where atom 'ai' has index 'vi'.
 *
 * It may be however desired that our 'collisions' buffer is aligned with the UNSORTED indexes
 * where atom 'ai' has index 'i'.
 *
 * This shader does just that! It UNSORTS the 'collisions' buffer to the original positions.
 */
class WgCompUnsortShader extends WgCompShader {

    private readonly inputs: WgCompUnsortShaderInputBuffers;
    private readonly output?: WgBuffer<Uint32Array>;
    private readonly outputOffset?: number;

    /**
     * @param context The WebGPU context
     * @param inputs The input buffers. See this class's description for more details.
     *               - in_collisions: The SORTED 'collisions' buffer
     *               - indices: The indices buffer used in the sorting of 'in_collisions'
     *               - out_collisions: The UNSORTED 'collisions' buffer
     * @param output The output buffer (useful for debugging)
     * @param outputOffset The output offset (useful for debugging)
     */
    public constructor(context: WgContext, inputs: WgCompUnsortShaderInputBuffers, output?: WgBuffer<Uint32Array>, outputOffset?: number) {
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: inputs.in_collisions },
                { binding: 1, buffer: inputs.indices },
                { binding: 2, buffer: inputs.out_collisions }
            ]
        }];
        super(context, code, buffers);
        this.inputs = inputs;
        this.output = output;
        this.outputOffset = outputOffset;
    }

    public get outputs() {
        if (!this.output) return [];
        return [{
            src: this.inputs.out_collisions, srcOffset: 0,
            dst: this.output, dstOffset: this.outputOffset || 0,
            byteSize: this.inputs.out_collisions.byteSize
        }];
    }

    public get dispatchSize(): readonly [number, number, number] {
        return [Math.ceil(this.inputs.indices.shape[0]) / 256, 1, 1];
    }

    public get workgroupSize(): readonly [number, number, number] {
        return [256, 1, 1];
    }

    public dispose(): void {
        // Do nothing :)
    }
}

export default WgCompUnsortShader;