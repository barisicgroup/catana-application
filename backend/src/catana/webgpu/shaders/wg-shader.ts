import WgContext from "../wg-context";
import WgBuffer from "../wg-buffer";

type Buffer = { group: number, entries: { binding: number, buffer: WgBuffer<any> }[] };

/**
 * A WebGPU shader where all the required data and buffers can be
 * passed to and will be assigned to their respective bindings
 */
abstract class WgShader {

    private readonly _pipeline: GPUPipelineBase;
    public get pipeline() { return this._pipeline; }

    private readonly _bindGroups: { index: number, bindGroup: GPUBindGroup }[];
    public get bindGroups() { return this._bindGroups; };

    protected constructor(context: WgContext, pipeline: GPUPipelineBase, module: GPUShaderModule, buffers: readonly Buffer[]) {
        this._pipeline = pipeline;
        this._bindGroups = buffers.map(g => {
            return {
                index: g.group,
                bindGroup: context.device.createBindGroup({
                    layout: this._pipeline.getBindGroupLayout(g.group),
                    entries: g.entries.map(e => {
                        return {
                            binding: e.binding,
                            resource: { buffer: e.buffer.buffer }
                        };
                    })
                })
            };
        });
    }

    public abstract dispose(): void;
}

export default WgShader;