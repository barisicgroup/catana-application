/// <reference types="@webgpu/types" />

import WgContext from "../wg-context";
import WgPass from "../wg-pass";

/**
 * Describes a WebGPU algorithm that solves a specific task
 * A WgAlgorithm will usually contain and run multiple WgShaders and WgPasses
 */
abstract class WgAlgorithm {

    protected readonly context: WgContext;

    protected constructor(context: WgContext) {
        this.context = context;
    }

    /**
     * Used by subclasses to execute a series of WgPasses in sequence
     */
    protected async _run(passes: WgPass[], debug?: string): Promise<void> {
        return new Promise<void>((resolve) => {
            // Nothing to do if we have no passes :)
            if (passes.length === 0) {
                resolve();

            // If there is a debug context provided, try to use WebGPU features (timestamp-query) to
            // measure how long each pass took on the GPU
            } else if (debug) {
                (async () => {
                    // WARNING: As of 19/08/2022, Chrome must be initialized with the following argument:
                    // --disable-dawn-features=disallow_unsafe_apis
                    const supportsTime = this.context.supportsFeature("timestamp-query");

                    const queriesCount = passes.length + 1;
                    const queriesSize = queriesCount * (Uint32Array.BYTES_PER_ELEMENT * 2);
                    const querySet = this.context.device.createQuerySet({
                        type: "timestamp",
                        count: queriesCount
                    });
                    const queryBuffer = !supportsTime ? null : this.context.device.createBuffer({
                        size: queriesSize,
                        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
                    });
                    const queryMapBuffer = !supportsTime ? null : this.context.device.createBuffer({
                        size: queriesSize,
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                    });

                    let queryIndex = 0;
                    const time1 = performance.now();
                    const commandEncoder = this.context.device.createCommandEncoder();
                    for (const p of passes) {
                        if (supportsTime) commandEncoder.writeTimestamp(querySet, queryIndex++);
                        p.encode(commandEncoder, debug);
                    }
                    if (supportsTime) {
                        commandEncoder.writeTimestamp(querySet, queryIndex);
                        commandEncoder.resolveQuerySet(querySet, 0, queriesCount, queryBuffer!, 0);
                        commandEncoder.copyBufferToBuffer(queryBuffer!, 0, queryMapBuffer!, 0, queriesSize);
                    }
                    const time2 = performance.now();
                    this.context.device.queue.submit([commandEncoder.finish()]);
                    const time3 = performance.now();

                    if (supportsTime) queryMapBuffer!.mapAsync(GPUMapMode.READ).then(() => {
                        const times = new BigUint64Array(queryMapBuffer!.getMappedRange());
                        let totalTime = 0;
                        for (let i = 1; i < queriesCount; ++i) {
                            const elapsed = Number(times[i] - times[i - 1]) / 1000000; // nanoseconds to milliseconds
                            totalTime += elapsed;
                            const p = passes[i-1];
                            console.log("Pass '" + p.info.type.toUpperCase() + ":" + p.info.name + "' took " + elapsed + " ms");
                        }
                        console.log("Total time elapsed for '" + debug + "': " + totalTime + " ms");
                    });

                    console.log("Time to encode all passes: " + (time2 - time1) + " ms");
                    console.log("Time to make CommandBuffer: " + (time3 - time2) + " ms");

                    resolve();
                })();

            // If we are not in debug mode, simply encode each of the passes :)
            } else {
                const commandEncoder = this.context.device.createCommandEncoder();
                for (const p of passes) {
                    p.encode(commandEncoder, debug);
                }
                this.context.device.queue.submit([commandEncoder.finish()]);
                resolve();
            }
        });
    }
}

export default WgAlgorithm;