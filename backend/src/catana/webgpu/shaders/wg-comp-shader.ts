/// <reference types="@webgpu/types" />

import WgShader from "./wg-shader";
import WgContext from "../wg-context";
import WgBuffer from "../wg-buffer";

type Output = { src: WgBuffer<any>, srcOffset: number, dst: WgBuffer<any>, dstOffset: number, byteSize: number };

type Buffer = { group: number, entries: { binding: number, buffer: WgBuffer<any> }[] };

/**
 * A WebGPU compute shader where all the required data and buffers can be
 * passed to and will be assigned to their respective bindings.
 *
 * Also provides compute shader-specific information, like dispatchSize and workgroupSize
 */
abstract class WgCompShader extends WgShader {
    protected constructor(context: WgContext, code: string, buffers: readonly Buffer[]) {
        const cache = context.getCache<GPUComputePipeline>(code, (module : any) => {
            return context.device.createComputePipeline({
                layout: "auto" as any,
                compute: {
                    module: module,
                    entryPoint: "main"
                }
            });
        });
        super(context, cache.pipeline, cache.module, buffers);
    }

    public get pipeline(): GPUComputePipeline {
        return super.pipeline as GPUComputePipeline;
    }

    // Public abstract
    public abstract get dispatchSize(): readonly [number, number, number];
    public abstract get outputs(): readonly Output[]; // TODO remove
    public abstract dispose(): void;
    public abstract get workgroupSize(): readonly [number, number, number];

}

export default WgCompShader;