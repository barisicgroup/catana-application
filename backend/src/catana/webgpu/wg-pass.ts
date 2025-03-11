/// <reference types="@webgpu/types" />

import WgContext from "./wg-context";
import WgBuffer, {WgBufferDataType} from "./wg-buffer";
import WgCompShader from "./shaders/wg-comp-shader";
import WgCompFillShader from "./shaders/wg-comp-fill-shader";
import WgRendShader from "./shaders/wg-rend-shader";

type EncodeFun = (commandEncoder: GPUCommandEncoder, debug?: string) => void;

interface PassInfo {
    readonly name: string,
    readonly type: "copy" | "comp" | "clear" | "rend"
    //readonly shape: [number, number, number],
    readonly dispatchSize?: [number, number, number]
}

/**
 * Describes a WebGPU pass that can be used in a WgAlgorithm to create a pipeline
 */
class WgPass {

    //private static readonly debug_outputs: Map<WgAlgorithm, WgBuffer<any>[]> = new Map<WgAlgorithm, WgBuffer<any>[]>();
    private static readonly debug_outputs: Map<string, WgBuffer<any>[]> = new Map<string, WgBuffer<any>[]>();

    /**
     * Outputs are a mechanic to use during debugging, to enable that the contents of a buffer can be read on the CPU
     * (and printed) to facilitate debugging
     * @param debug The name of the debugging instance
     */
    public static getOutputs(debug: string): null | WgBuffer<any>[] {
        //return WgAlgorithm.debug_outputs[this.name];
        //return WgAlgorithm.debug_outputs.get(this) || null;
        return this.debug_outputs.get(debug) || null;
    }

    /**
     * See WgPass.getOutputs
     */
    public static deleteOutputs(debug: string) {
        const outputs = this.debug_outputs.get(debug);
        if (!outputs) return;
        for (const o of outputs) o.dispose();
        this.debug_outputs.delete(debug);
    }

    /**
     * See WgPass.getOutputs
     */
    public static async printOutputs(debug: string) {
        const outputs = this.debug_outputs.get(debug);
        if (outputs) {
            for (const o of outputs) {
                o.read().then((data) => {
                    console.log({debug: debug, name: o.name, data: data});
                    //if (del) o.dispose();
                });
            }
        }
        //if (del) this.debug_outputs.delete(debug);
    }

    public readonly info: PassInfo;
    public readonly encode: EncodeFun;

    private constructor(encode: EncodeFun, info: PassInfo) {
        this.encode = encode;
        this.info = info;
    }

    /**
     * Creates a copy pass, copying (in the GPU) the contents of one source buffer into a destination buffer
     * @param context The WebGPU context
     * @param src The source buffer (to be copied from)
     * @param dst The destination buffer (to be copied into)
     * @param srcOffset The offset of the source buffer (where to begin copying from)
     * @param dstOffset The offset of the destination buffer (where to begin copying into)
     * @param byteSize The size/length (in bytes) of the data to copy
     */
    public static createCopyPass<T extends WgBufferDataType>(context: WgContext,
                                                             src: WgBuffer<T>, dst: WgBuffer<T>,
                                                             srcOffset: number = 0, dstOffset: number = 0,
                                                             byteSize?: number): WgPass {
        if (!src.copiable || !dst.pastable) {
            const errors: string[] = [];
            if (!src.copiable) errors.push("src buffer " + this.buffName(src) + " must be copiable (needs GPUBufferUsage.COPY_SRC)");
            if (!dst.pastable) errors.push("dst buffer " + this.buffName(dst) + " must be pastable (needs GPUBufferUsage.COPY_DST)");
            throw "Cannot create copy pass: " + errors.join(" and ");
        }
        return new WgPass((commandEncoder, debug) => {
            commandEncoder.copyBufferToBuffer(
                src.buffer, srcOffset,
                dst.buffer, dstOffset,
                byteSize || (Math.min(src.byteSize - srcOffset, dst.byteSize - dstOffset)));
        }, {
            name: "BUF[" + this.buffName(src) + "]-TO-BUF[" + this.buffName(dst) + "]",
            type: "copy"
        });
    }

    /**
     * Creates a compute pass (that executes a compute shader)
     * @param context The WebGPU context
     * @param compShader The compute shader to be executed
     */
    public static createCompShaderPass(context: WgContext, compShader: WgCompShader): WgPass {
        return new WgPass(((commandEncoder, debug) => {
            // Create debug (copy) passes - before
            //this.createDebugCopyPasses(context, commandEncoder, compShader, debug, "OUTPUT (BEFORE)");

            // Initialize
            //compShader.initialize(context);
            const d = compShader.dispatchSize;
            if (!d.every(v => v <= 65535)) {
                console.error("Dispatch size for " + name + " is too big (>65535): " + d[0] + ", " + d[1] + ", " + d[2]);
            }

            // Create compute pass
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(compShader.pipeline);
            for (const g of compShader.bindGroups) passEncoder.setBindGroup(g.index, g.bindGroup);
            passEncoder.dispatchWorkgroups(d[0], d[1], d[2]);
            passEncoder.end();

            // Create debug (copy) passes - after
            //this.createDebugCopyPasses(context, commandEncoder, compShader, debug, "OUTPUT (AFTER)");
            //this.createDebugCopyPasses(context, commandEncoder, compShader, debug, "OUTPUT");
        }), {
            name: this.compName(compShader),
            type: "comp"
        });
    }

    /**
     * Creates a fill pass (that fills the contents of a buffer with a uniform scalar value)
     * @param context The WebGPU context
     * @param buffer The buffer to fill
     * @param value The value to fill the buffer with
     */
    public static createFillPass(context: WgContext, buffer: WgBuffer<any>, value: number): WgPass {
        if (value === 0) {
            if (!buffer.pastable) {
                console.warn("Cannot create fill(0) pass using 'clear' with buffer " + this.buffName(buffer) +
                    " because this buffer is not pastable (needs GPUBufferUsage.COPY_DST");
            } else {
                return new WgPass(((commandEncoder, debug) => {
                    commandEncoder.clearBuffer(buffer.buffer);
                }), {
                    name: this.buffName(buffer),
                    type: "clear"
                });
            }
        }
        return this.createCompShaderPass(context, new WgCompFillShader(context, buffer, value));
    }

    /**
     * Creates a render pass (that executes render operations)
     * @param context The WebGPU context
     * @param rendShader The rendering shader
     */
    public static createRenderPass(context: WgContext, rendShader: WgRendShader): WgPass {
        return new WgPass(((commandEncoder, debug) => {

            //rendShader.initialize(context);

            const pipeline = rendShader.pipeline;

            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: rendShader.view,
                        //clearValue: { r: 0.9, g: 0.8, b: 0.9, a: 1.0 },
                        loadOp: "load",
                        storeOp: "store"
                    }
                ]
            });
            passEncoder.setPipeline(pipeline);
            for (const g of rendShader.bindGroups) passEncoder.setBindGroup(g.index, g.bindGroup);
            for (const b of rendShader.vertexBuffers) passEncoder.setVertexBuffer(b.slot, b.buffer.buffer);
            passEncoder.draw(rendShader.vertexCount, rendShader.instanceCount);
            passEncoder.end();

        }), {
            name: this.rendName(rendShader),
            type: "rend"
        });
    }

    // Utility functions -----------------------------------------------------------------------------------------------

    /*private static createDebugCopyPasses(context: WgContext, commandEncoder: GPUCommandEncoder, compShader: WgCompShader, debug?: string, pre?: string) {
        if (debug !== undefined) {
            if (!this.debug_outputs.get(debug)) this.debug_outputs.set(debug, []);
            const outputs: WgBuffer<any>[] = this.debug_outputs.get(debug)!;
            for (const g of compShader.buffers) {
                for (const e of g.entries) {
                    const buffer = e.buffer;
                    if (buffer.copiable && buffer.type === BufferType.STORAGE) {
                        const name = pre + (pre ? ":" : "") + compShader.constructor.name + ":" + buffer.name;
                        const index = outputs.findIndex((v) => v.name === name);
                        const output = index === -1 ? buffer.cloneOutput(context, name) : outputs[index];
                        this.createCopyPass(context, buffer, output).encode(commandEncoder);
                        if (index === -1) outputs.push(output);
                    }
                }
            }
        }
    }*/

    private static buffName(b: WgBuffer<any>): string {
        return b.name + "(" + b.length + ")";
    }

    private static compName(s: WgCompShader): string {
        const ds = s.dispatchSize;
        const ws = s.workgroupSize;
        const x = ds[0] * ws[0];
        const y = ds[1] * ws[1];
        const z = ds[2] * ws[2];
        return s.constructor.name + "(" + (x * y * z) + ")";
    }

    private static rendName(s: WgRendShader): string {
        return s.constructor.name; // TODO
    }
}

export default WgPass;