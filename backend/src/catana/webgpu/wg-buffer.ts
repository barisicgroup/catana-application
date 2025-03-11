/// <reference types="@webgpu/types" />

import WgContext from "./wg-context";

export type WgBufferDataType = Float32Array | Uint32Array;

interface DataConstructor<T extends WgBufferDataType> {
    new(length: number): T,
    new(arrayBuffer: ArrayBuffer): T,
    readonly BYTES_PER_ELEMENT: number
}

type Shape = readonly [number, number, number];
//type Uniform = ("f32" | "vec3<f32>" | "mat4x4<f32>");

export enum BufferType {
    STORAGE, UNIFORM, OUTPUT
}

enum CopyType {
    NONE = 0, SRC = 0b01, DST = 0b10, BOTH = 0b11
}

export enum BufferFeature {
    COPIABLE, CLEARABLE, VERTEX, WRITABLE
}

/**
 * WebGPU buffer class, allowing for easy creation and keeping track of GPU buffers
 */
class WgBuffer<T extends WgBufferDataType> {

    private readonly _shape: Shape;
    private readonly _byteSize: number;
    private readonly _constructor: DataConstructor<T>;
    private readonly _type: BufferType;
    private readonly _name: string;
    private readonly _copyType: CopyType;

    public get shape() { return this._shape; }
    public get length() { return WgBuffer.calculateLength(this.shape); }
    public get byteSize() { return this._byteSize; }
    public get type() { return this._type; }
    public get name() { return this._name; }
    public get copiable() { return (this._copyType & CopyType.SRC) > 0 }
    public get pastable() { return (this._copyType & CopyType.DST) > 0; }

    private readonly _buffer: GPUBuffer;
    public get buffer() { return this._buffer; }

    private constructor(readonly context: WgContext,
                        buffer: GPUBuffer,
                        shape: Shape,
                        byteSize: number,
                        constr: DataConstructor<T>,
                        type: BufferType,
                        copyType: CopyType,
                        name: string = "unnamed") {
        this._shape = shape;
        this._buffer = buffer;
        this._byteSize = byteSize;
        this._constructor = constr;
        this._type = type;
        this._copyType = copyType;
        this._name = name;
    }

    public dispose() {
        this._buffer.destroy();
    }

    /**
     * @returns The length (in number of elements) of a buffer
     */
    public static calculateLength(shape: Shape): number {
        return shape[0] * shape[1] * shape[2];
    }

    /**
     * Creates a storage buffer, to be read/written into in shaders, and initialize it with some data
     * @param context The WebGPU context
     * @param shape The shape of the buffer (the number of elements will be calculated from this
     * @param constr The constructor for the data (TODO: remove this! can be gotten from data.constructor)
     * @param data The data to be initially copied into the buffer
     * @param feats The features of the buffer
     * @param name The name of the buffer (especially useful for debugging)
     */
    public static createStorage<T extends WgBufferDataType>(context: WgContext,
                                                            shape: Shape,
                                                            constr: DataConstructor<T>,
                                                            data: T | T[],
                                                            feats: BufferFeature[] = [],
                                                            name?: string): WgBuffer<T> {
        if (!Array.isArray(data)) data = [data];
        const length = data.map(v => v.length).reduce((a,b) => a + b);
        console.assert(length === shape.reduce((a,b) => a * b));
        const byteSize = this.calculateLength(shape) * constr.BYTES_PER_ELEMENT;
        const usage = GPUBufferUsage.STORAGE | this.getUsageFromFeats(feats);
        const buffer = context.device.createBuffer({
            mappedAtCreation: true,
            size: byteSize,
            usage: usage
        });
        //let byteOffset = 0;
        let offset = 0;
        const mappedArray = new constr(buffer.getMappedRange());
        for (const d of data) {
            //new constr(buffer.getMappedRange(byteOffset, d.byteLength)).set(d);
            //byteOffset += d.byteLength;
            mappedArray.set(d, offset);
            offset += d.length;
        }
        buffer.unmap();
        return new WgBuffer(context, buffer, shape, byteSize, constr, BufferType.STORAGE, this.getCopyType(feats), name);
    }

    /**
     * Creates an empty storage buffer, to be read/written into in shaders
     * @param context The WebGPU context
     * @param shape The shape of the buffer (the number of element will be calculated from this)
     * @param constr The constructor for the data (TODO: remove this! can be gotten from data.constructor)
     * @param feats The features of the buffer
     * @param name The name of the buffer (especially useful for debugging)
     */
    public static createEmptyStorage<T extends WgBufferDataType>(context: WgContext,
                                                                 shape: Shape,
                                                                 constr: DataConstructor<T>,
                                                                 feats: BufferFeature[] = [],
                                                                 name?: string): WgBuffer<T> {
        const byteSize = this.calculateLength(shape) * constr.BYTES_PER_ELEMENT;
        const usage = GPUBufferUsage.STORAGE | this.getUsageFromFeats(feats);
        const buffer = context.device.createBuffer({
            mappedAtCreation: false,
            size: byteSize,
            usage: usage
        });
        return new WgBuffer(context, buffer, shape, byteSize, constr, BufferType.STORAGE, this.getCopyType(feats), name);
    }

    /**
     * Creates an output buffer that cannot be used in shaders, but only:
     * - (GPU) Copied into (with commandEncoder.copyBufferToBuffer)
     * - (CPU) Read from (with buffer.mapAsync)
     * @param context The WebGPU context
     * @param shape The shape of the buffer (the number of elements will be calculated from this)
     * @param constr The constructor for the data (TODO: remove this! can be gotten from data.constructor)
     * @param name The name of the buffer (especially useful for debugging)
     */
    public static createOutput<T extends WgBufferDataType>(context: WgContext, shape: Shape, constr: DataConstructor<T>, name?: string): WgBuffer<T> {
        const byteSize = this.calculateLength(shape) * constr.BYTES_PER_ELEMENT;
        const usage = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
        const buffer = context.device.createBuffer({
            mappedAtCreation: false,
            size: byteSize,
            usage: usage
        });
        return new WgBuffer(context, buffer, shape, byteSize, constr, BufferType.OUTPUT, CopyType.DST, name);
    }

    /**
     * Creates an uniform buffer
     * @param context The WebGPU context
     * @param constr The constructor for the data (TODO: remove this! can be gotten from data.constructor)
     * @param data The data to be initially copied into the buffer
     * @param variable Whether this buffer may be written into
     * @param name The name of the buffer (especially useful for debugging)
     */
    public static createUniform<T extends WgBufferDataType>(context: WgContext, constr: DataConstructor<T>, data: T, variable: boolean = false, name?: string): WgBuffer<T> {
        const copyType: CopyType = variable ? CopyType.DST : CopyType.NONE;
        const usage = GPUBufferUsage.UNIFORM | this.getUsageFromCopyType(copyType);
        const buffer = context.device.createBuffer({
            mappedAtCreation: true,
            size: data.byteLength,
            usage: usage
        });
        if (data instanceof Float32Array) new Float32Array(buffer.getMappedRange()).set(data);
        else /*if (data instanceof Uint32Array)*/ new Uint32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();
        return new WgBuffer(context, buffer, [data.length, 1, 1], data.byteLength, constr, BufferType.UNIFORM, copyType, name);
    }

    /**
     * Create a new buffer that is exactly like this buffer, except:
     * - It's empty (uninitialized)
     * - Features may differ, that depends on the 'feats' input parameter
     * - Name may differ, that depends on the 'name' input parameter
     * @param context The WebGPU context
     * @param feats The shape of the buffer (the number of elements will be calculated from this)
     * @param name The name of the buffer (especially useful for debugging)
     */
    public cloneEmpty(context: WgContext, feats: BufferFeature[] = [], name?: string): WgBuffer<T> {
        /*const buffer = context.device.createBuffer({
            mappedAtCreation: false,
            size: this._byteSize,
            usage: this._usage
        });
        return new WgBuffer<T>(context, buffer, this._shape, this._byteSize, this._usage, this._constructor);*/
        return WgBuffer.createEmptyStorage(context, this._shape, this._constructor, feats, name);
    }

    /**
     * Create a new buffer that is exactly like this buffer, except:
     * - It's empty (uninitialized)
     * - It in an output buffer (see WgBuffer.createOutput)
     * @param context The WebGPU context
     * @param name The name of the buffer (especially useful for debugging)
     */
    public cloneOutput(context: WgContext, name?: string): WgBuffer<T> {
        return WgBuffer.createOutput(context, this._shape, this._constructor, name || ("CLONE:OUTPUT:" + this.name));
    }

    /**
     * Write into this buffer from the CPU. WARNING: This will only work if the buffer has one of the following features:
     * - BufferFeature.CLEARABLE
     * - BufferFeature.WRITABLE
     * @param data The data to write into the buffer
     * @param byteOffset The offset, in bytes, where the writing will being
     * @param size The size (length), in number of elements, of the data that will be written
     */
    public write(data: T, byteOffset: number = 0, size?: number) {
        size = size === undefined ? data.length : size;
        this.context.device.queue.writeBuffer(this.buffer, byteOffset, data, 0, size);
    }

    /**
     * Read this buffer into the CPU. WARNING: This will only work if the buffer is an output buffer
     * (see WgBuffer.createOutput and WgBuffer.cloneOutput)
     * @param offset The offer, in number of elements, where the reading will begin
     * @param length The length (size), in number of elemets, of the data that will be read
     */
    public async read(offset: number = 0, length?: number): Promise<T> {
        await this._buffer.mapAsync(GPUMapMode.READ);
        const data = new this._constructor(length || this.length);

        // TODO maybe do this without having to copy the GPU array?
        // Example, maybe return a direct view to the GPU array? A 'readonly Float32Array'
        // Or let the user provide an array... if it is provided, copy, if not, return 'readonly Float32Array'
        // Something like that...
        data.set(new this._constructor(this._buffer.getMappedRange()), offset);

        this._buffer.unmap();

        return data;
    }

    // UTILITY METHODS -------------------------------------------------------------------------------------------------

    private static getCopyType(feats: BufferFeature[]): CopyType {
        let src = false;
        let dst = false;
        for (const f of feats) {
            switch (f) {
                case BufferFeature.CLEARABLE: dst = true; break;
                case BufferFeature.COPIABLE: src = true; break;
            }
        }
        return (src && dst) ? CopyType.BOTH : (src ? CopyType.SRC : (dst ? CopyType.DST : CopyType.NONE));
    }

    private static getUsageFromCopyType(copyType: CopyType): number {
        switch (copyType) {
            case CopyType.BOTH: return GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
            case CopyType.DST: return GPUBufferUsage.COPY_DST;
            case CopyType.SRC: return GPUBufferUsage.COPY_SRC;
            case CopyType.NONE: return 0;
            default: throw "Unexpected CopyType: " + copyType;
        }
    }

    private static getUsageFromFeats(feats: BufferFeature[]): number {
        let usage = 0;
        for (const feat of feats) {
            if (feat === BufferFeature.COPIABLE) usage |= GPUBufferUsage.COPY_SRC;
            if (feat === BufferFeature.CLEARABLE) usage |= GPUBufferUsage.COPY_DST;
            if (feat === BufferFeature.VERTEX) usage |= GPUBufferUsage.VERTEX;
            if (feat === BufferFeature.WRITABLE) usage |= GPUBufferUsage.COPY_DST;
        }
        return usage;
    }
}

export default WgBuffer