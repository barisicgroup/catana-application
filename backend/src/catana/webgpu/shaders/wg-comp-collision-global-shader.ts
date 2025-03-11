import WgCompShader from "./wg-comp-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";

import code from "./src/collision-global.wgsl";

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface WgCompCollisionGlobalShaderInput {
    in_xyzcr: WgBuffer<Float32Array>;
    in_bonds: WgBuffer<Uint32Array>;
    //in_perComp_matrix: WgBuffer<Float32Array>;
    //in_perBin_elemCount: WgBuffer<Uint32Array>;
    in_perBinElemCount_scan: WgBuffer<Uint32Array>;

    out_collisions: WgBuffer<Uint32Array>;
}

interface WgCompCollisionGlobalShaderUniforms {
    gridMin: Vector3;
    gridMax: Vector3;
    gridBinSize: Vector3;
    lenience: number;
}

interface WgCompCollisionGlobalShaderOutput {
    collisions?: WgBuffer<Uint32Array>;
    collisions_offset?: number
}

/**
 * Performs collision detection globally, over all provided elements/atoms.
 * For each element atom, this shader compares each atom with its neighbors (found via a uniform grid).
 *
 * Based on an atom's radius, its proximity with a neighbor, and whether they have a bond, a collision is determined
 * Element/Atom A collides with atom B if the following applies:
 * - A and B are different:      index(A) != index(B)
 * - A and B overlap:            distance(A,B)  <  radius(A) + radius(B) - lenience  <-  Lenience is a uniform parameter
 * - A and B do not have a bond: !bond(A,B)
 * If any of these rules do not apply, element/atom A does NOT collide
 *
 * This check is performed for each element/atom.
 * The output of this shader is a 'collisions' U32 buffer where each bit represents whether an atom collides or not.
 * 0 means the atom does not collide with any other atom; 1 means the atom collides with at least one other atom
 */
class WgCompCollisionGlobalShader extends WgCompShader {

    private readonly input: WgCompCollisionGlobalShaderInput;
    private readonly gridUniforms: WgBuffer<Float32Array>;
    private readonly collisionUniforms: WgBuffer<Float32Array>;
    private readonly output?: WgCompCollisionGlobalShaderOutput;

    /**
     * @param context The WebGPU context
     * @param input The input buffers:
     *              - in_xyzcr:                Input data, describing each element/atom's data.
     *                                         Each element/atom is described by 4x float32 elements in this buffer.
     *                                         The first 3 f32s describe the element/atom's 3D XYZ position
     *                                         The 4th f32 encodes the following:
     *                                         - The element/atom's radius in picometers, encoded in the first 8 bits
     *                                         - The element/atom's initial index (elemId), encoded in the last 24 bits
     *                                           See 'in_bonds' to see how elemId is useful
     *
     *              - in_bonds:                Input data, describing each element/atom's BOND information
     *                                         Each element/atom is described by 4x uint32 elements in this buffer.
     *                                         Each of these 4 elements represents the initial index (elemId) of another
     *                                         element/atom, with which this element/atom has a bond.
     *                                         To indicate that no bonds exists, the value 0xffffffff is used.
     *                                         That allows these 4x uint32 slots to point
     *                                         from 0 to 4 other elements/atoms.
     *
     *              - in_perBinElemCount_scan: The scan/prefix-sum of the element/atom count of each bin/cell of
     *                                         the grid (see WgCompScanShader).
     *
     *              - out_collisions:          The output buffer, describing, for each atom, whether this atom collides
     *                                         or not. This is a U32 buffer, where each bit encodes an element/atom.
     *                                         0 means that this atom does not collide with any other atom.
     *                                         1 means that this atom collides with at least one other atom.
     *                                         See this class's description for more details
     *
     * @param uniforms The uniforms for this shader:
     *
     *                 - gridMin:     The min-point of the grid
     *                 - gridMax:     The max-point of the grid
     *                 - gridBinSize: The xyz sizes of a grid bin/cell
     *                 Together, these three values describe an axis-aligned box, subdivided uniformly into bins/cells
     *
     *                 - lenience:    Given in Ångströms.
     *                                A bias value that allows elements/atoms that overlap just a little bit to be
     *                                considered as non-overlapping. The largest this value is, the less collisions are
     *                                expected to be detected
     *
     * @param output The output buffer and offset (useful for debugging)
     */
    public constructor(context: WgContext,
                       input: WgCompCollisionGlobalShaderInput,
                       uniforms: WgCompCollisionGlobalShaderUniforms,
                       output?: WgCompCollisionGlobalShaderOutput) {

        const uniforms_data = new Float32Array([
            uniforms.gridMin.x,     uniforms.gridMin.y,     uniforms.gridMin.z,     0, // 0 for padding
            uniforms.gridMax.x,     uniforms.gridMax.y,     uniforms.gridMax.z,     0, // 0 for padding
            uniforms.gridBinSize.x, uniforms.gridBinSize.y, uniforms.gridBinSize.z, 0 // 0 for padding
        ]);
        const gridParamsBuffer = WgBuffer.createUniform(context, Float32Array, uniforms_data);
        const collisionParamsBuffer = WgBuffer.createUniform(context, Float32Array, new Float32Array([uniforms.lenience]), true);
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: input.in_xyzcr },
                { binding: 1, buffer: input.in_bonds },
                //{ binding: 1, buffer: this.input.in_perComp_matrix },
                { binding: 2, buffer: input.in_perBinElemCount_scan },
                { binding: 3, buffer: input.out_collisions },
                { binding: 4, buffer: gridParamsBuffer },
                { binding: 5, buffer: collisionParamsBuffer }
            ]
        }];

        super(context, code, buffers);

        console.assert(input.in_xyzcr.shape[0] === 4);
        console.assert(Math.ceil(input.in_xyzcr.shape[1] / 32) === input.out_collisions.shape[0]);

        this.input = input;
        this.gridUniforms = gridParamsBuffer;
        this.collisionUniforms = collisionParamsBuffer;
        this.output = output;
    }

    public get outputs() {
        if (!this.output || !this.output.collisions) return [];
        return [{
            src: this.input.out_collisions,
            srcOffset: 0,
            dst: this.output.collisions,
            dstOffset: this.output.collisions_offset || 0,
            byteSize: this.input.out_collisions.byteSize
        }];
    }

    public setCollisionParams(params: { lenience: number }) {
        this.collisionUniforms.write(new Float32Array([params.lenience]));
    }

    public get dispatchSize(): [number, number, number] {
        return [Math.ceil(this.input.in_xyzcr.shape[1] / 256), 1, 1];
    }

    public get workgroupSize(): readonly [number, number, number] {
        return [256, 1, 1];
    }

    public dispose() {
        this.gridUniforms.dispose();
    }
}

export default WgCompCollisionGlobalShader;