import code from "./src/grid-assign.wgsl";

import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";
import {Matrix4} from "three";

interface Vector3 {
    x: number,
    y: number,
    z: number
}

interface WgCompGridAssignShaderBuffers {
    //readonly in_perComp_matrix: WgBuffer<Float32Array>,
    //readonly in_perComp_elemStart: WgBuffer<Uint32Array>,
    //readonly in_perElem_x: WgBuffer<Float32Array>,
    //readonly in_perElem_y: WgBuffer<Float32Array>,
    //readonly in_perElem_z: WgBuffer<Float32Array>,
    readonly in_perElem_elemData: WgBuffer<Float32Array>,
    readonly out_perBin_elemCount: WgBuffer<Uint32Array>,
    readonly out_perElem_binId: WgBuffer<Uint32Array>;
    //readonly out_perElem_xyzc: WgBuffer<Float32Array>;
}

interface WgCompGridAssignShaderUniforms {
    readonly gridMin: Vector3,
    readonly gridMax: Vector3,
    readonly gridBinSize: Vector3,
}

interface WgCompGridAssignShaderOutputBuffers {
    readonly perBin_elemCount?: WgBuffer<Uint32Array>,
    readonly perElem_binId?: WgBuffer<Uint32Array>,
    readonly perElem_elemData?: WgBuffer<Float32Array>,

    readonly perBin_elemCount_offset?: number,
    readonly perElem_binId_offset?: number,
    readonly perElem_elemData_offset?: number
}

/**
 * Assigns elements/atoms to a bin/cell in a grid
 * Additionally, it counts how many elements/atoms each bin/cell contains
 *
 * It may also apply a transform operation to a set of atoms through the function setTransform.
 * To deactivate this, see the function removeTransform
 *
 * See constructor for more details
 */
class WgCompGridAssignShader extends WgCompShader {

    private readonly inputBuffers: WgCompGridAssignShaderBuffers;
    private readonly gridUniforms: WgBuffer<Float32Array>;
    private readonly compUniforms: WgBuffer<Float32Array>;
    private readonly outputBuffers?: WgCompGridAssignShaderOutputBuffers;

    /**
     * @param context The WebGPU contet
     * @param uniforms A buffer describing the grid:
     *                 - gridMin:     The min-point of the grid
     *                 - gridMax:     The max-point of the grid
     *                 - gridBinSize: The xyz sizes of a grid bin/cell
     *                 Together, these values describe an axis-aligned box, subdivided uniformly into bins/cells
     * @param in_buffers The input buffers:
     *                   - in_perElem_elemData:  A buffer describing each element/atom
     *                                           Each element/atom occupies 4x float32 places in the buffer
     *                                           The first 3 places describe the element/atom's 3D coordinates (XYZ)
     *                                           The 4th places describes some other data (not used in this shader)
     *                   - out_perBin_elemCount: An output buffer (per grid bin/cell) that will contain the number of
     *                                           atoms assigned to this grid bin/cell
     *                   - out_perElem_binId:    An output buffer that will contain (per element/atom) the index of the
     *                                           cell that this element/atom lies in
     * @param out_buffers The output buffers and offsets (useful for debugging)
     */
    constructor(context: WgContext,
                uniforms: WgCompGridAssignShaderUniforms,
                in_buffers: WgCompGridAssignShaderBuffers,
                out_buffers?: WgCompGridAssignShaderOutputBuffers) {

        // Set up input buffers
        const inputBuffers = in_buffers;
        const outputBuffers = out_buffers;
        const gridUniforms = WgBuffer.createUniform(context, Float32Array, new Float32Array([
            uniforms.gridMin.x, uniforms.gridMin.y, uniforms.gridMin.z, 0, // 0 for padding
            uniforms.gridMax.x, uniforms.gridMax.y, uniforms.gridMax.z, 0, // 0 for padding
            uniforms.gridBinSize.x, uniforms.gridBinSize.y, uniforms.gridBinSize.z, 0 // 0 for padding
        ]));
        const compUniformsArray = new Float32Array(20);
        new Uint32Array(compUniformsArray.buffer, 16 * 4, 2).set([0xffffffff, 0xffffffff]);
        const compUniforms = WgBuffer.createUniform(context, Float32Array, compUniformsArray, true);

        // Set up buffers
        const buffers = [{
            group: 0,
            entries: [
                //{ binding: 0, buffer: this.inputBuffers.in_perComp_matrix },
                //{ binding: 1, buffer: this.inputBuffers.in_perComp_elemStart },

                //{ binding: 2, buffer: this.inputBuffers.in_perElem_x },
                //{ binding: 3, buffer: this.inputBuffers.in_perElem_y },
                //{ binding: 4, buffer: this.inputBuffers.in_perElem_z },
                { binding: 0, buffer: inputBuffers.in_perElem_elemData },

                { binding: 1, buffer: inputBuffers.out_perBin_elemCount },
                { binding: 2, buffer: inputBuffers.out_perElem_binId },
                //{ binding: 7, buffer: this.inputBuffers.out_perElem_xyzc },

                { binding: 3, buffer: gridUniforms },
                { binding: 4, buffer: compUniforms }
            ]
        }];

        super(context, code, buffers);

        this.inputBuffers = inputBuffers;
        this.outputBuffers = outputBuffers;
        this.gridUniforms = gridUniforms;
        this.compUniforms = compUniforms;
    }

    public get outputs() {
        if (!this.outputBuffers) return [];
        const outputs = [];
        const ins = [this.inputBuffers.out_perBin_elemCount, this.inputBuffers.out_perElem_binId];
        const outs = [this.outputBuffers.perBin_elemCount, this.outputBuffers.perElem_binId];
        const offs = [this.outputBuffers.perBin_elemCount_offset, this.outputBuffers.perElem_binId_offset];
        for (let i = 0; i < ins.length; ++i) {
            const out = outs[i];
            if (!out) continue;
            outputs.push({
                src: ins[i], srcOffset: 0,
                dst: out, dstOffset: offs[i] || 0,
                byteSize: ins[i].byteSize
            });
        }
        return outputs;
    }

    public get dispatchSize(): [number, number, number] {
        return [Math.ceil(this.inputBuffers.out_perElem_binId.length / 256), 1, 1];
    }

    public get workgroupSize(): [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        this.gridUniforms.dispose();
        this.compUniforms.dispose();
    }

    /**
     * Makes it so that, in future executions of this shader, a set of elements/atoms will be transformed by a matrix
     * The function removeTransform() deactivates this feature
     * @param transform The matrix that will be used to transform the set of elements/atoms
     * @param elemIdStart The index of the first element/atom that will be transformed by the 'transform' matrix
     * @param elemIdEnd The index PLUS ONE of the last element/atom to be transformed by the 'transform' matrix
     *                  i.e.: The index of the first element/atom AFTER 'elemIdStart' that will NOT be transformed by
     *                        the 'transform' matrix
     */
    public async setTransform(transform: Matrix4, elemIdStart: number, elemIdEnd: number) {
        const data = new Float32Array(18);
        data.set(transform.elements, 0);
        new Uint32Array(data.buffer, 16 * 4, 2).set([elemIdStart, elemIdEnd]);
        await this.compUniforms.write(data);
    }

    /**
     * Makes it so that, in future executions of this shader, no elements/atoms will be transformed.
     * See setTransform() to activate transformation of elements/atoms
     */
    public async removeTransform() {
        const data = new Float32Array(2);
        new Uint32Array(data.buffer, 0, 2).set([0xffffffff, 0xffffffff]);
        await this.compUniforms.write(data, 16 * 4);
    }
}

export default WgCompGridAssignShader;