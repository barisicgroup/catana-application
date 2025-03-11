/// <reference types="@webgpu/types" />

import WgRenderTarget from "./wg-render-target";
import WgContext from "./wg-context";

/**
 * Describes a render target based on an HTMLCanvasElement
 */
class WgCanvas extends WgRenderTarget {

    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: GPUCanvasContext;

    //private _texture: GPUTexture;
    //private _view: GPUTextureView;
    private readonly _format: GPUTextureFormat;

    /**
     * Sets up a WebGPU render target based on a newly created HTMLCanvasElement
     * @param context The WebGPU context
     * @param width The canvas width (therefore also the render target width)
     * @param height The canvas height (therefore also the render target height)
     */
    public constructor(context: WgContext, width: number, height: number) {
        super(context, width, height);

        this.canvas = document.createElement("canvas");
        const ctx = this.canvas.getContext("webgpu");
        if(ctx) {
            this.ctx = ctx;
        } else {
            throw "Unable to get WebGPU context";
        }

        this._format = context.gpu.getPreferredCanvasFormat();
        this.setSize(width, height);

        this.ctx.configure({
            device: this.webGpuContext.device,
            format: this.format,
            alphaMode: "premultiplied" // We want our canvas to be transparent
        });
    }

    /**
     * @returns The HTMLCanvasElement on which the rendering is taking place
     */
    public get domElement(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Resets the size of this render target, of the HTMLCanvasElement, and also reconfigure the Canvas's WebGPU context
     * @param width The new width
     * @param height The new height
     */
    public setSize(width: number, height: number) {
        super.setSize(width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        //this._texture = this.ctx.getCurrentTexture();
        //this._view = this._texture.createView();
    }

    /**
     * Unconfigure the Canvas's WebGPU context and remove the HTMLCanvasElement from the DOM tree
     */
    public dispose() {
        this.ctx.unconfigure();
        this.canvas.remove();
        //this._texture.destroy();
    }

    public get texture(): GPUTexture {
        return this.ctx.getCurrentTexture();
    }

    public get view(): GPUTextureView {
        return this.texture.createView();
    }

    public get format(): GPUTextureFormat {
        return this._format;
    }
}

export default WgCanvas;