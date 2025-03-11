/// <reference types="@webgpu/types" />

type CacheData<PipelineType extends GPUPipelineBase> = { module: GPUShaderModule, pipeline: PipelineType };

class Cache<PipelineType extends GPUPipelineBase> {
    private map: Map<number, CacheData<PipelineType>> = new Map<number, CacheData<PipelineType>>();
    private static hash(value: string): number {
        // Source: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
        let hash = 0, i, chr;
        if (value.length === 0) return hash;
        for (i = 0; i < value.length; i++) {
            chr   = value.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    public set(key: string, value: CacheData<PipelineType>): this {
        const hash = Cache.hash(key);
        if (this.map.has(hash)) console.warn("Hash conflict in Cache. Possible non-unique hashing");
        this.map.set(hash, value);
        return this;
    }
    public get(key: string): undefined | CacheData<PipelineType> {
        const hash = Cache.hash(key);
        return this.map.get(hash);
    }
}

/**
 * The WebGPU context, powering all WebGPU features that Catana will use
 */
class WgContext {
    //private cache: { [code: string]: Cache<any> } = {};
    private cache: Cache<any> = new Cache<any>();

    private readonly _adapter: GPUAdapter;
    private readonly _device: GPUDevice;
    private readonly _gpu: GPU;
    private readonly features: GPUFeatureName[];

    private constructor(adapter: GPUAdapter, device: GPUDevice, gpu: GPU, features: GPUFeatureName[]) {
        this._adapter = adapter;
        this._device = device;
        this._gpu = gpu;
        this.features = features;
    }

    /**
     * In order to avoid keeping many instances of the same GPUShaderModule, this cache stores the already-created
     * GPUShaderModules as a mapping of their code (VERY inefficient, TODO: improve)
     * @param code The shader code
     * @param createPipelineFun A function to create a pipeline based on a given GPUShaderModule
     */
    public getCache<PipelineType extends GPUPipelineBase>(code: string, createPipelineFun: (module: GPUShaderModule) => PipelineType): CacheData<PipelineType> {
        let c = this.cache.get(code);
        if (c) return c;
        const module = this.device.createShaderModule({ code });
        c = { module, pipeline: createPipelineFun(module) };
        this.cache.set(code, c);
        return c;
    }

    public get device(): GPUDevice {
        return this._device;
    }

    public get adapter(): GPUAdapter {
        return this._adapter;
    }

    public get gpu(): GPU {
        return this._gpu;
    }

    /**
     * @param feature The feature which may or may not be supported by the GPU
     * @returns True if 'feature' is supported by the GPU,
     *          False otherwise
     */
    public supportsFeature(feature: "timestamp-query"): boolean {
        return this.features.includes(feature);
    }

    //public createShader<T extends WebGpuShader>(clas: new(context: WebGpuContext) => T): T {
    //return new clas(this);
    //}

    /**
     * Whether WebGPU is supported
     */
    public static isSupported(): boolean {
        return !!navigator.gpu;
    }

    /**
     * Creates a new WebGPU context if WebGPU could be initialized
     * @returns If WebGPU could be initialized, a new WebGPU context
     *          Otherwise, a string explaining why WebGPU could not be initialized
     *
     */
    public static async get(): Promise<WgContext | string> {
        const gpu: null | GPU = navigator.gpu || null;
        if (!gpu) return "Your current browser does NOT support WebGPU!";

        // TODO enable the selection of a specific GPU

        const adapter = await gpu.requestAdapter({
            powerPreference: "high-performance"
        });
        if (!adapter) return "GPU adapter not found";

        const features: GPUFeatureName[] = ["timestamp-query"];
        const supportedFeatures = adapter.features;
        for (let i = features.length - 1; i >= 0; --i) {
            const feat = features[i];
            const supported = supportedFeatures.has(feat);
            if (!supported) {
                console.warn("Requested feature '" + feat + "' is not supported. Let's attempt to continue without it.");
                features.splice(i, 1);
            }
        }

        return new WgContext(
            adapter,
            await adapter.requestDevice({
                requiredFeatures: features
            }), gpu, features);
    }
}

export default WgContext;