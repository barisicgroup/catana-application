/// <reference types="@webgpu/types" />

import WgContext from "./build/catana/webgpu/wg-context";
import WgBuffer, { BufferFeature } from "./build/catana/webgpu/wg-buffer";
import WgPass from "./build/catana/webgpu/wg-pass";

import WgCompSetShader from "./build/catana/webgpu/shaders/wg-comp-set-shader";
import WgCompGridAssignShader from "./build/catana/webgpu/shaders/wg-comp-grid-assign-shader";
import WgCompScanShader from "./build/catana/webgpu/shaders/wg-comp-scan-shader";
import WgCompAddShader from "./build/catana/webgpu/shaders/wg-comp-add-shader";
import WgCompSortShader from "./build/catana/webgpu/shaders/wg-comp-sort-shader";
import WgCompMapXyzShader from "./build/catana/webgpu/shaders/wg-comp-map-xyz-shader";
import WgCompCollisionGlobalShader from "./build/catana/webgpu/shaders/wg-comp-collision-global-shader";
import WgCompUnsortShader from "./build/catana/webgpu/shaders/wg-comp-unsort-shader";

import WgAlgorithm from "./build/catana/webgpu/algorithms/wg-algorithm";
import WgGenericAlgorithm from "./build/catana/webgpu/algorithms/wg-generic-algorithm";
import WgScanAlgorithm from "./build/catana/webgpu/algorithms/wg-scan-algorithm";
import WgCollisionAlgorithm from "./build/catana/webgpu/algorithms/wg-collision-algorithm";

// Three
import { Vector3, Vector4, Matrix4, Box3, PerspectiveCamera } from "../../node_modules/three/build/three.module";

// BitArray
import BitArray_Legacy, { BitArray } from "./build/utils/bitarray";

export {
    WgContext, WgBuffer, WgPass,
    BufferFeature,

    // Shaders
    WgCompSetShader,
    WgCompGridAssignShader,
    WgCompScanShader,
    WgCompAddShader,
    WgCompSortShader,
    WgCompMapXyzShader,
    WgCompCollisionGlobalShader,
    WgCompUnsortShader,

    // Algorithms
    WgAlgorithm,
    WgScanAlgorithm,
    WgCollisionAlgorithm,

    // Stuff created in this file
    WgGridAssignScanAlgorithm,
    WgShaderAlgorithm,

    // Other stuff
    PerspectiveCamera,
    Vector3, Vector4, Matrix4, Box3,
    BitArray,
    BitArray_Legacy
};

// Test implementations ------------------------------------------------------------------------------------------------

class WgShaderAlgorithm extends WgGenericAlgorithm {
    constructor (context, compShader, debug) {
        super(context, [], debug);
        this.passes.push(WgPass.createCompShaderPass(context, compShader));
        for (const out of compShader.outputs) {
            this.passes.push(WgPass.createCopyPass(context,
                out.src, out.dst, out.srcOffset, out.dstOffset, out.byteSize));
        }
    }
}

class WgGridAssignScanAlgorithm extends WgGenericAlgorithm {
    constructor(context, in_comp_mat, in_elem_xyzcr, out_bin_elemCount, out_elem_binId, gridMin, gridMax, gridBinSize, debug) {
        super(context, [], debug);

        const buffers = {
            in_perComp_matrix: in_comp_mat,
            in_perElem_xyzcr: in_elem_xyzcr,
            out_perBin_elemCount: out_bin_elemCount,
            out_perElem_binId: out_elem_binId
        };

        const uniforms = {
            gridMin: gridMin,
            gridMax: gridMax,
            gridBinSize: gridBinSize
        };

        this.output = {
            //perElem_binId: WgBuffer.createOutput(context, in_elem_x.shape, Uint32Array)
            perBin_elemCount: WgBuffer.createOutput(context, out_bin_elemCount.shape, Uint32Array)
        };

        // Shaders
        const gridAssign = new WgCompGridAssignShader(context, uniforms, buffers, this.output);

        // Passes
        this.passes.push(
            WgPass.createCompShaderPass(context, gridAssign),
            ...WgScanAlgorithm.createPasses(context, out_bin_elemCount),
            WgPass.createCopyPass(context, out_bin_elemCount, this.output.perBin_elemCount)
        );
    }
    async read() {
        return this.output.perBin_elemCount.read();
    }
}