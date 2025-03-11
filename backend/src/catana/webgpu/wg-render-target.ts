/// <reference types="@webgpu/types" />

import WgContext from "./wg-context";

/**
 * Describes a render target: where we can render/draw things onto
 * (see WgCanvas for an example)
 */
abstract class WgRenderTarget {
    protected readonly webGpuContext: WgContext;

    private _width: number;
    private _height: number;

    protected constructor(context: WgContext, width: number, height: number) {
        this.webGpuContext = context;
        this._width = width;
        this._height = height;
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
    };
    public get width(): number { return this._width; }
    public get height(): number { return this._height; }

    public abstract get texture(): GPUTexture;
    public abstract get format(): GPUTextureFormat;
    public abstract get view(): GPUTextureView;
    public abstract dispose(): void;
}

export default WgRenderTarget;