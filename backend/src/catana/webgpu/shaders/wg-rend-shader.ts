/// <reference types="@webgpu/types" />

import WgShader from "./wg-shader";
import WgBuffer from "../wg-buffer";
import WgContext from "../wg-context";

type Buffer = { group: number, entries: { binding: number, buffer: WgBuffer<any> }[] };

/**
 * A WebGPU rendering shader where all the required data and buffers can be
 * passed to and will be assigned to their respective bindings.
 *
 * Also provides rendering shader-specific information, like vertexCount and vertexBuffers
 */
abstract class WgRendShader extends WgShader {
    protected constructor(context: WgContext, module: GPUShaderModule, pipeline: GPURenderPipeline, buffers: readonly Buffer[]) {
        super(context, pipeline, module, buffers);
    }

    public get instanceCount(): number { return 1; };

    public get pipeline(): GPURenderPipeline { return super.pipeline as GPURenderPipeline; };

    //public abstract get target(): WgRenderTarget;
    public abstract get view(): GPUTextureView;
    public abstract get vertexCount(): number;
    public abstract get vertexBuffers(): readonly { slot: number, buffer: WgBuffer<any> }[];
}

export default WgRendShader;