import {
    Color,
    CustomBlending,
    DataTexture,
    FloatType, Group,
    LinearFilter,
    Mesh,
    NearestFilter,
    OrthographicCamera, PerspectiveCamera,
    PlaneGeometry,
    RedFormat,
    RGBAFormat,
    Scene,
    ShaderMaterial,
    Texture,
    Uniform,
    UnsignedByteType, Vector3,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import CatanaShader from "./catana-shader";
import CatanaSelection, {
    ComponentSelection, FilteredSelection,
    PickingSelection,
    RepresentationSelection
} from "../catana-selection";
import SelectionShaderMode = CatanaShader.SelectionShaderMode;
import Stage from "../../stage/stage";
import Viewer from "../../viewer/viewer";

export abstract class Renderable {

    /**
     * TODO write doc
     * @param r
     * @param camera
     * @param target
     * @param superSampleIndex The index of the superSample pass; or -1 if no superSample is taking place
     */
    public abstract render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget | null, superSampleIndex: number): void;

    public abstract setSize(width: number, height: number): void;
    public abstract clickLeft(x: number, y: number, s: Stage): boolean; // If returns true, further mouse events are stopped. False, events propagate
    public abstract hover(x: number, y: number, s: Stage): boolean; // If returns true, further mouse events are stopped. False, events propagate
    public abstract downLeft(x: number, y: number, s: Stage): boolean; // If returns true, further mouse events are stopped. False, events propagate
    public abstract upLeft(x: number, y: number, s: Stage): boolean; // If returns true, further mouse events are stopped. False, events propagate
    public abstract dragLeft(x: number, y: number, s: Stage): boolean; // If returns true, further mouse events are stopped. False, events propagate

    private static readonly _pixelwiseDataTarget: WebGLRenderTarget = new WebGLRenderTarget(
        0, 0,
        {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            depthBuffer: true,
            stencilBuffer: false,
            format: RGBAFormat,
            type: FloatType,
            generateMipmaps: false
        }
    );
    public static get pixelwiseDataTarget(): WebGLRenderTarget {
        return Renderable._pixelwiseDataTarget;
    }

    private static _nextRenderableIndex: number = 1;
    private readonly _renderableIndex: number;

    protected constructor() {
        this._renderableIndex = Renderable._nextRenderableIndex++;
    }

    protected get renderableIndex(): number {
        return this._renderableIndex;
    }

    protected getPixel(x: number, y: number, r: WebGLRenderer): null | Vector3 {
        const buffer = new Float32Array(4); // TODO not always supported...
        r.readRenderTargetPixels(Renderable.pixelwiseDataTarget, x, y, 1, 1, buffer);
        if (buffer[0] !== this._renderableIndex) return null;
        return new Vector3(buffer[1], buffer[2], buffer[3]);
    }
}

/**
 * Responsible for the rendering of hightlights of 3D structures
 * Initially planned to perform general rendering, or other rendering operations, but there was no need for anything
 * other than highlights TODO complete... there is the Renderable class that is managed by CatanaRendering :)
 */
class CatanaRendering {

    public static readonly SELECTION_COLORS = {
        NEUTRAL: 0xffff00,
        NEGATIVE: 0xff0000,
        POSITIVE: 0x00ff00
    } as const;

    /**
     * The 'fullscreen' target is used to render into a quad that occupies the whole screen
     */
    private readonly fullscreenCamera: OrthographicCamera;
    private readonly _fullscreenTarget: WebGLRenderTarget;
    private readonly fullscreenUniforms: {[p: string]: Uniform};
    private readonly fullscreenMaterial: ShaderMaterial;
    private readonly fullscreenScene: Scene;

    /**
     * The 'selection' target is a one-component target (only red component) used to process the pickingTarget and
     * decide which fragments will be highlighted. The result is rendered into the selectionTarget
     */
    private readonly selectionTarget: WebGLRenderTarget;
    private readonly selectionUniforms: {[p: string]: Uniform};
    private readonly selectionMaterial: ShaderMaterial;
    private readonly selectionScene: Scene;

    // Texture (more like a buffer) containing the IDs that we want to be highlighted
    private selectionIdsTexture: Texture;

    /**
     * The 'blurRed' targets are a one-component target (only red component) that are used to process and render the
     * highlighting. Two targets are used in order to perform back-and-forth blurring.
     * They are reduced in size (see CatanaRendering.getReducedWidth/Height) to make blurring faster (and not that much
     * worse visually)
     */
    private readonly blurRedTarget1: WebGLRenderTarget;
    private readonly blurRedTarget2: WebGLRenderTarget;
    private readonly blurRedUniforms: {[p: string]: Uniform};
    private readonly blurRedMaterial: ShaderMaterial;
    private readonly blurRedScene: Scene;

    private selecting: boolean = false;
    private removeInside: boolean = true;

    // The picking target from elsewhere (e.g., viewer.ts)
    private readonly pickingTarget: WebGLRenderTarget;

    // The picking target completely managed by CatanaRendering TODO used by what?
    private pickingTargetPrivate: WebGLRenderTarget;

    // Catana Renderable components (see src/catana/visualizations for examples)
    private renderables: Array<Renderable> = [];

    //private groupToRender: null | Group = null;
    private sceneToRender: Scene | null;

    constructor(dprWidth: number, dprHeight: number, pickingTarget: WebGLRenderTarget) {
        this.pickingTarget = pickingTarget;
        this.pickingTargetPrivate = pickingTarget.clone();
        this.pickingTargetPrivate.scissor.copy(this.pickingTarget.scissor);

        // Source: https://codepen.io/Fyrestar/pen/abOEOda
        this.fullscreenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Targets
        this._fullscreenTarget = new WebGLRenderTarget(
            dprWidth, dprHeight,
            {
                minFilter: NearestFilter,
                magFilter: NearestFilter,
                depthBuffer: true,
                stencilBuffer: false,
                format: RGBAFormat,
                type: UnsignedByteType,
                generateMipmaps: false
            }
        );
        this.selectionTarget = new WebGLRenderTarget(
            dprWidth, dprHeight,
            {
                minFilter: LinearFilter,
                magFilter: LinearFilter,
                stencilBuffer: false,
                format: RedFormat,
                type: FloatType,
                generateMipmaps: false
            }
        );
        this.blurRedTarget1 = new WebGLRenderTarget(
            CatanaRendering.getReducedWidth(dprWidth), CatanaRendering.getReducedHeight(dprHeight),
            {
                minFilter: LinearFilter,
                magFilter: LinearFilter,
                stencilBuffer: false,
                format: RedFormat,
                type: FloatType,
                generateMipmaps: false
            }
        );
        this.blurRedTarget2 = this.blurRedTarget1.clone();

        this.fullscreenUniforms = {
            //srcTex: new Uniform(this._fullscreenTarget.texture),
            selTex: new Uniform(this.selectionTarget.texture),
            conTex: new Uniform(this.blurRedTarget2.texture),
            renderSelection: new Uniform(this.selecting),
            removeInside: new Uniform(this.removeInside),
            selColor: new Uniform(CatanaRendering.SELECTION_COLORS.NEUTRAL)
        };

        this.fullscreenMaterial = new ShaderMaterial({
            uniforms: this.fullscreenUniforms,
            vertexShader: CatanaShader.getFullscreenVertShader(),
            fragmentShader: CatanaShader.getFullscreenFragShader(),
            //premultipliedAlpha: true, // TODO do we need this?
            //transparent: true, // we don't need this, since we'll render to the whole screen quad anyway
            blending: CustomBlending,
            //blendSrc: SrcAlphaFactor, // default anyway...
            //blendDst: OneMinusSrcAlphaFactor, // default anyway...
            depthTest: false,
            depthWrite: false,
            stencilWrite: false
        });

        this.fullscreenScene = new Scene();
        this.fullscreenScene.add(new Mesh(
            new PlaneGeometry(2, 2, 1, 1),
            this.fullscreenMaterial
        ));

        this.selectionUniforms = {
            idsTex: new Uniform(this.pickingTarget.texture),
            selectedIdsBuffer: new Uniform(null), // TODO
            selectedIdsBufferSize: new Uniform(null), // TODO
            selectedIdsCount: new Uniform(0), // TODO
            mode: new Uniform(CatanaShader.SelectionShaderMode.MODE_NONE),
            //contourColor: new Uniform(this.getColor(CatanaRenderingSelectionColor.NEUTRAL))
        };
        /*if (!this.renderer.capabilities.isWebGL2) {
          Object.assign(this.selectionUniforms, { "texSize": new Uniform(this.pickingTarget.texture) });
        }*/

        this.selectionMaterial = new ShaderMaterial({
            uniforms: this.selectionUniforms,
            vertexShader: CatanaShader.getSelectionVertShader(),
            fragmentShader: CatanaShader.getSelectionFragShader(), // TODO WebGL2
            //premultipliedAlpha: true, // TODO do we need this?
            //transparent: true, // we don't need this, since we'll render to the whole screen quad anyway
            //blending: CustomBlending,
            //blendSrc: SrcAlphaFactor, // default anyway...
            //blendDst: OneMinusSrcAlphaFactor, // default anyway...
            depthTest: false,
            depthWrite: false,
            stencilWrite: false
        });

        this.selectionScene = new Scene();
        this.selectionScene.add(new Mesh(
            new PlaneGeometry(2, 2, 1, 1),
            this.selectionMaterial
        ));

        this.blurRedUniforms = {
            srcTex: new Uniform(this.selectionTarget.texture),
            horizontal: new Uniform(true),
            texSize: new Uniform([CatanaRendering.getReducedWidth(dprWidth), CatanaRendering.getReducedHeight(dprHeight)])
        };

        this.blurRedMaterial = new ShaderMaterial({
            uniforms: this.blurRedUniforms,
            vertexShader: CatanaShader.getBlurRedVertShader(),
            fragmentShader: CatanaShader.getBlurRedFragShader(),
            //premultipliedAlpha: true, // TODO do we need this?
            //transparent: true, // we don't need this, since we'll render to the whole screen quad anyway
            //blending: CustomBlending,
            //blendSrc: SrcAlphaFactor, // default anyway...
            //blendDst: OneMinusSrcAlphaFactor, // default anyway...
            depthTest: false,
            depthWrite: false,
            stencilWrite: false
        })

        this.blurRedScene = new Scene();
        this.blurRedScene.add(new Mesh(
            new PlaneGeometry(2, 2, 1, 1),
            this.blurRedMaterial
        ));

        this.setSize(dprWidth, dprHeight);
    }

    // Lower resolution for more efficient blur
    private static getReducedWidth(width: number): number {
        return Math.floor(width / 2);
    }

    // Lower resolution for more efficient blur
    private static getReducedHeight(height: number): number {
        return Math.floor(height / 2);
    }

    public get fullscreenTarget(): WebGLRenderTarget {
        return this._fullscreenTarget;
    }

    public setSize(width: number, height: number) {
        this._fullscreenTarget.setSize(width, height);
        this.selectionTarget.setSize(width, height);
        this.pickingTargetPrivate.setSize(width, height);

        this.blurRedTarget1.setSize(CatanaRendering.getReducedWidth(width), CatanaRendering.getReducedHeight(height));
        this.blurRedTarget2.setSize(CatanaRendering.getReducedWidth(width), CatanaRendering.getReducedHeight(height));

        Renderable.pixelwiseDataTarget.setSize(width, height);

        for (let renderable of this.renderables) {
            renderable.setSize(width, height);
        }
    }

    /**
     * @returns True to stop further mouse events. False, events propagate
     */
    private triggerEvent(x: number, y: number, event: (r: Renderable, x: number, y: number) => boolean): boolean {
        x *= window.devicePixelRatio;
        y *= window.devicePixelRatio;
        x = Math.max(x - 2, 0);
        y = Math.max(y - 2, 0);
        for (let renderable of this.renderables) {
            if (event(renderable, x, y)) return true;
        }
        return false;
    }
    public clickLeft(x: number, y: number, s: Stage): boolean {
        return this.triggerEvent(x, y, (r,x,y) => r.clickLeft(x, y, s));
    }
    public hover(x: number, y: number, s: Stage): boolean {
        return this.triggerEvent(x, y, (r,x,y) => r.hover(x, y, s));
    }
    public downLeft(x: number, y: number, s: Stage): boolean {
        return this.triggerEvent(x, y, (r,x,y) => r.downLeft(x, y, s));
    }
    public upLeft(x: number, y: number, s: Stage): boolean {
        return this.triggerEvent(x, y, (r,x,y) => r.upLeft(x, y, s));
    }
    public dragLeft(x: number, y: number, s: Stage): boolean {
        return this.triggerEvent(x, y, (r,x,y) => r.dragLeft(x, y, s));
    }
    public keyDown(key: string, s: Stage): boolean {
        return false; // TODO
    }

    public addRenderable(r: Renderable) {
        this.renderables.push(r);
    }

    public removeRenderable(r: Renderable) {
        const index = this.renderables.indexOf(r);
        if (index === -1) return;
        this.renderables.splice(index, 1);
    }

    /**
     * @returns True if the selecting state changed (false -> true || true -> false)
     *          False otherwise
     */
    private setSelecting(selecting: boolean): boolean {
        if (this.selecting !== selecting) {
            //this.fullscreenUniforms.renderSelection = new Uniform(selecting);
            this.fullscreenMaterial.uniforms.renderSelection.value = selecting;
            this.selecting = selecting;
            return true;
        }
        return false;
    }

    /**
     * @param removeInside If true, CONTOURS will be rendered (the initial highlighted fragments will be thrown away
     *                     and only the outside blur will be kept).
     *                     If false, nothing will be thrown away
     */
    private setRemoveInside(removeInside: boolean): boolean {
        if (this.removeInside !== removeInside) {
            this.fullscreenMaterial.uniforms.removeInside.value = removeInside;
            this.removeInside = removeInside;
            return true;
        }
        return false;
    }

    /**
     * Creates a selection texture/buffer and fills it with the IDs that we want selected
     * @param selectedIdsCount How many IDs we want selected
     * @param data An array holding the IDs to be selected (needs to be a multiple of 4 because the data will be encoded as vec4s)
     * @param mode The mode for selection (see CatanaShader.SelectionShaderMode)
     * @param color The color of the highlights
     */
    private setSelectedIds(selectedIdsCount: number, data: Float32Array, mode: CatanaShader.SelectionShaderMode, color: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {

        let bufferWidth;
        if (data.length === 0 || selectedIdsCount === 0) {
            data = new Float32Array(4);
            bufferWidth = 1;
        } else {
            // Here, we check if the length of 'data' is a multiple of 4
            // It needs to be, because each 4 elements of 'data' will become a vec4
            // >>2 = /4
            // <<2 = *4
            console.assert((data.length >> 2) << 2 === data.length);
            bufferWidth = data.length >> 2;
        }

        this.selectionIdsTexture = new DataTexture(data,
            bufferWidth, 1,
            RGBAFormat, FloatType,// TODO change type from float to... something else?
            undefined,
            undefined, undefined,
            NearestFilter, NearestFilter);

        this.selectionMaterial.uniforms.selectedIdsBuffer.value = this.selectionIdsTexture;
        this.selectionMaterial.uniforms.selectedIdsBufferSize.value = bufferWidth;
        this.selectionMaterial.uniforms.selectedIdsCount.value = selectedIdsCount;
        this.selectionMaterial.uniforms.mode.value = mode;

        this.fullscreenMaterial.uniforms.selColor.value = new Color(color);

        //this.groupToRender = null;
        this.sceneToRender = null;
    }

    /**
     * Sets up CatanaRendering so that it will render the highlights of a Three.js Group
     * @param group Group to be highlighted
     * @param color Color of the highlight
     */
    private setSelectedGroup(group: Group, color: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {
        this.setSelectedIds(0, new Float32Array(0), CatanaShader.SelectionShaderMode.MODE_EVERYTHING, color);
        //this.groupToRender = group;
        this.sceneToRender = new Scene();
        this.sceneToRender.add(group);
    }

    /**
     * Sets up CatanaRendering so that it will render the highlights from a pickingTarget
     * @param s Holds the IDs (pickingIds and objectIds) to be highlighted
     * @param c Color of the highlight
     */
    private selectPicking(s: PickingSelection, c: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {
        const count = s.size;

        const size = count <= 2 ? 4
            : Math.pow(2, Math.floor(Math.log2(count - 1))) * 4;
        const data = new Float32Array(size);

        s.forEach((i, p) => {
            i *= 2;
            data[i  ] = p.pickingId;
            data[i+1] = p.objectId;
        });
        //data.fill(0, count * 2); // Unnecessary :) zero by default

        // And here, we check if the given 'selectedIdsCount' fits inside 'data'
        console.assert(count << 1 <= data.length);

        this.setSelectedIds(count, data, CatanaShader.SelectionShaderMode.MODE_PICKING, c);
    }

    /**
     * Sets up CatanaRendering so that it will render the highlights of a Representation or all representations of a Component
     * @param s Representation or component to be highlighted
     * @param c Color of the highlights
     */
    private selectByOid(s: RepresentationSelection | ComponentSelection, c: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {
        const mode = s instanceof RepresentationSelection
            ? CatanaShader.SelectionShaderMode.MODE_REPRESENTATION
            : CatanaShader.SelectionShaderMode.MODE_COMPONENT;
        const count = s.oidCount;

        const size = count <= 4 ? 4
            : Math.pow(2, Math.floor(Math.log2(count - 1)) + 1);
        const data = new Float32Array(size);

        let i = 0;
        s.forEachOid((oid) => {
            data[i++] = oid;
        });
        this.setSelectedIds(count, data, mode, c);
    }

    /**
     * WARNING: This has not been tested thoroughly enough. It may not work as intended
     * Sets up CatanaRendering so that it will render the highlights based on filters
     * @param s Filtered selection to be highlighted
     * @param c Color of the highlights
     */
    private selectFiltered(s: FilteredSelection, c: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {
        this.setSelectedGroup(s.createPickingGroup(), c);

        /*let previousFilters: { [id: number]: string } = {};
        s.forEach((i, r) => {

            // Set filters for each representation (silently)
            previousFilters[i] = r.filterString;
            r.setFilter(s.filterString, true); // SILENTLY!

            // Set up render stuff
            for (let buffer of r.bufferList) {
                if (buffer.pickable) {
                    const pickingMesh = buffer.getPickingMesh()
                    group.add(pickingMesh);
                }
            }
        });

        // Render
        // TODO

        // Wrap up by resetting filters (again, silently)
        s.forEach((i, s) => {
            s.setFilter(previousFilters[i], true); // AGAIN, SILENTLY!
        });*/
    }

    /**
     * Sets up CatanaRendering so that it will render highlights based on the selection managed by CatanaSelection
     * @param catSel CatanaSelection object describing what to highlight
     * @param c Color of the highlights
     */
    public select(catSel?: CatanaSelection, c: number = CatanaRendering.SELECTION_COLORS.NEUTRAL) {
        if (!catSel) {
            this.unselect();
        /*} else if (ids instanceof PickingProxy) {
            if (ids.oid > 0) {
                this.setSelecting(true);
                this.setSelectedIds(1, new Float32Array([ids.pid, ids.oid, 0, 0]), SelectionShaderMode.MODE_PICKING, c);
            } else {
                this.unselect();
            }*/
        } else {
            const sel = catSel.selection;
            if (!sel) {
                this.setSelecting(false);
                return;
            }
            this.setSelecting(true);

            if (sel instanceof PickingSelection) {
                this.selectPicking(sel, c);

            } else if (sel instanceof FilteredSelection) {
                this.selectFiltered(sel, c);

            } else if (sel instanceof RepresentationSelection || sel instanceof ComponentSelection) {
                this.selectByOid(sel, c);

            } else {
                console.error("Unexpected Selection type: " + sel);
            }
        }
    }

    /**
     * Sets up CatanaRendering so that it will NOT render any highlights
     */
    public unselect(): boolean {
        let changed: boolean = this.setSelecting(false);
        if (changed) {
            this.setSelectedIds(0, new Float32Array(0), SelectionShaderMode.MODE_NONE);
        }
        return changed;
    }

    /**
     * Render highlights if there are any
     */
    public render(v: Viewer, camera?: PerspectiveCamera | OrthographicCamera,
                  removeInside: boolean = true, renderSelection: boolean = true,
                  renderTarget: WebGLRenderTarget | null = null) {

        camera = camera ? camera : v.cameraTransformed;
        const r = v.renderer;

        if (renderSelection && this.selecting) {
            //console.log("renderSelection and this.selecting are both true here!");
            this.renderSelection(r, camera, removeInside);
        }

        r.setRenderTarget(renderTarget);
        //r.clear();
        r.render(this.fullscreenScene, this.fullscreenCamera);
    }

    //public renderSelection(v: Viewer, removeInside: boolean = true, renderTarget?: WebGLRenderTarget) {
        //this.render(v, undefined, removeInside, true, renderTarget);
    //}
    private renderSelection(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, removeInside: boolean = true) {
        this.setRemoveInside(removeInside);

        if (this.sceneToRender) {
            r.setRenderTarget(this.pickingTargetPrivate);
            r.clear();
            r.render(this.sceneToRender, camera);
            this.selectionMaterial.uniforms.idsTex.value = this.pickingTargetPrivate.texture;
        } else {
            this.selectionMaterial.uniforms.idsTex.value = this.pickingTarget.texture;
        }

        r.setRenderTarget(this.selectionTarget);
        //r.clear();
        r.render(this.selectionScene, this.fullscreenCamera);

        this.blurRedMaterial.uniforms.srcTex.value = this.selectionTarget.texture;
        this.blurRedMaterial.uniforms.texSize.value = [this.selectionTarget.width, this.selectionTarget.height];
        this.blurRedMaterial.uniforms.horizontal.value = true;
        r.setRenderTarget(this.blurRedTarget1);
        //r.clear();
        r.render(this.blurRedScene, this.fullscreenCamera);

        this.blurRedMaterial.uniforms.srcTex.value = this.blurRedTarget1.texture;
        this.blurRedMaterial.uniforms.texSize.value = [this.blurRedTarget1.width, this.blurRedTarget1.height];
        this.blurRedMaterial.uniforms.horizontal.value = false;
        r.setRenderTarget(this.blurRedTarget2);
        //r.clear();
        r.render(this.blurRedScene, this.fullscreenCamera);
    }

    /**
     * Renders all Renderables added with CatanaRendering.addRenderable
     */
    public renderVisualizations(v: Viewer, camera: PerspectiveCamera | OrthographicCamera, renderTarget: WebGLRenderTarget | null, superSampleIndex: number = -1) {
        const r = v.renderer;
        r.setRenderTarget(Renderable.pixelwiseDataTarget);
        r.clear();
        for (let renderable of this.renderables) {
            renderable.render(r, camera, renderTarget, superSampleIndex);
        }
    }
}

export default CatanaRendering;