import Stage from "../../stage/stage";
import WgCollisionAlgorithm, {
    ComponentObject, WgCollisionAlgorithmCollisionParameters,
    WgCollisionAlgorithmRenderingParameters
} from "../webgpu/algorithms/wg-collision-algorithm";
import {Debug, Log} from "../../globals";
import StructureComponent from "../../component/structure-component";
import Structure from "../../structure/structure";
import CgStructureComponent from "../component/cg-structure-component";
import Component from "../../component/component";
import {Signal} from "signals";
import {BitArray} from "../../utils/bitarray";
import {
    LineSegments,
    Matrix4,
    OrthographicCamera,
    PerspectiveCamera, WebGLRenderer, WebGLRenderTarget,
} from "three";
import WgPass from "../webgpu/wg-pass";
import {Renderable} from "../webgl/catana-rendering";
import WgCanvas from "../webgpu/wg-canvas";
import {WgRendCollisionShaderMode} from "../webgpu/shaders/wg-rend-collision-shader";
import Viewer from "../../viewer/viewer";
import {createBoundingBox} from "../../viewer/viewer-utils";
import WgContext from "../webgpu/wg-context";

interface CatanaCollisionSignals {
    collisionChanged: Signal;
    errorChanged: Signal;
}

type AtomicComponent = StructureComponent | CgStructureComponent;

type ProcessData = { c: AtomicComponent, matrix: Matrix4 };

/**
 * Manages the communication between Catana's back/frontend and the WebGPU classes
 * This achieves a nice isolation of the WebGPU code, so very few components of Catana have to be aware of its inner
 * workings. This class is one of these few components
 */
class CatanaCollision extends Renderable {

    private static readonly DEBUG_NAME = "CatanaCollision";

    /**
     * A bit array where each bit represents an atom.
     * The atom index in the bit array matches the atom index in the atom store of its structure
     * When more components/structures are taking part in collision detection, the atom indexes in the bit array are
     * offset by the number of atoms of all previous components
     *
     * Example:
     * Component A has 10 atoms
     * Component B has 30 atoms
     * Component C has 20 atoms
     * _collisions.get(5) -> 6th atom of Component A
     * _collisions.get(12) -> 3rd atom of Component B
     * _collisions.get(40) -> 1st atom of Component C
     */
    private _collisions: null | BitArray = null;
    public get collisions(): null | BitArray { return this._collisions?.clone() || null; }

    public readonly signals: CatanaCollisionSignals = {
        collisionChanged: new Signal(),
        errorChanged: new Signal()
    };

    private readonly _components: readonly AtomicComponent[];    // Components taking part in collision detection
    private readonly _perComp_atomCount: readonly number[];      // Per component atom count
    private readonly _componentSignals: readonly (() => void)[]; // Per component matrixChanged signal
    public get components(): readonly AtomicComponent[] { return this._components; }

    private readonly algorithm: WgCollisionAlgorithm;
    public readonly domElement: HTMLCanvasElement; // HTMLCanvasElement that will be used for WebGPU rendering
    private processing: null | ProcessData = null; // The data for the next collision to be processed
    private isProcessing: boolean = false;         // Whether the collisions are currently in the process of being detected

    private readonly boundingBoxMesh: LineSegments; // Box representing the volume where collisions can be detected
    private boundingBoxVisible: boolean = true;

    private constructor(algorithm: WgCollisionAlgorithm, comps: ComponentObject[], domElement: HTMLCanvasElement) {
        super();

        console.assert(comps.length <= WgCollisionAlgorithm.MAX_COMPONENTS);

        this.algorithm = algorithm;
        this.domElement = domElement;

        // Populate the component data
        // Components, per component atomCounts, per component matrixChanged signals
        const components = new Array<AtomicComponent>(comps.length);
        const perComp_atomCount = new Array<number>(comps.length);
        const signals = new Array<() => void>(comps.length);
        for (let i = 0; i < comps.length; ++i) {
            const c = comps[i];
            const signal: () => void = () => {
                this.updateComponent(c.c);
            };
            c.c.signals.matrixChanged.add(signal);
            signals[i] = signal;
            perComp_atomCount[i] = comps[i].s.atomCount;
            components[i] = c.c;
        }
        this._components = components;
        this._perComp_atomCount = perComp_atomCount;
        this._componentSignals = signals;

        console.assert(this._components.length === this._componentSignals.length);

        this.boundingBoxMesh = createBoundingBox(algorithm.gridBox);
    }

    public dispose() {
        for (let i = 0; i < this._components.length; ++i) {
            const c = this._components[i];
            const signal = this._componentSignals[i];
            c.signals.matrixChanged.remove(signal);
        }
        this.algorithm.dispose();
        WgPass.deleteOutputs(CatanaCollision.DEBUG_NAME);
    }

    private static async createComponentObject(c: AtomicComponent): Promise<ComponentObject> {
        let promise: Promise<Structure>;
        if (c instanceof StructureComponent) {
            promise = Promise.resolve(c.structure);
        } else {//if (c instanceof CgStructureComponent) {
            promise = c.cgStructure.buildAtomicStructure();
        }
        return promise.then((s) => ({ c, s }));
    }

    /**
     * Initializes a CatanaCollision instanced based on the given Stage
     * All StructureComponents and CgStructureComponents in the stage will take part in collision detection
     * See CatanaCollision.fromComponents for a more detailed description of all parameters
     */
    public static async fromStage(stage: Stage,
                                  radius: number,
                                  mode: "x" | "o" | WgRendCollisionShaderMode,
                                  color: string,
                                  opacity: number,
                                  lenience: number,
                                  thickness: number): Promise<string | CatanaCollision> {
        const components: AtomicComponent[] = [];
        stage.eachComponent((c) => {
            if (c instanceof StructureComponent || c instanceof CgStructureComponent) components.push(c);
        });
        return this.fromComponents(components, stage.viewer, radius, mode, color, opacity, lenience, thickness);
    }

    /**
     * Initializes a CatanaCollision instance based on the given components
     * @param components The components that will take part in collision detection
     * @param viewer The viewer where the collision will be visualized
     * @param radius The radius value of the collision rendering (negative values have special meaning... see WgRendCollisionShader > WgRendCollisionShaderRadiusMode)
     * @param mode The mode of the collision rendering markers (like X or O; see WgRendCollisionShader > WgRendCollisionShaderMode)
     * @param color The color of the rendered markers
     * @param opacity The opacity of the rendered markers
     * @param lenience How lenient the collision detection should be (also may have an effect in the rendering)
     * @param thickness The thickness of the rendered markers
     */
    public static async fromComponents(components: AtomicComponent[],
                                       viewer: Viewer,
                                       radius: number,
                                       mode: "x" | "o" | WgRendCollisionShaderMode,
                                       color: string,
                                       opacity: number,
                                       lenience: number,
                                       thickness: number): Promise<string | CatanaCollision> {
        const context = await WgContext.get();
        if (typeof context === "string") {
            //Log.error(context);
            return context || "WebGPU not supported. Try using Google Chrome.";
        }

        // Extract a structure from all components
        const comps_promises: Promise<ComponentObject>[] = [];
        const rejectedComponents: Component[] = [];
        for (const c of components) {
            if (comps_promises.length > WgCollisionAlgorithm.MAX_COMPONENTS) {
                rejectedComponents.push(c);
            } else {
                comps_promises.push(this.createComponentObject(c));
            }
        }

        // Check if we have enough components
        if (comps_promises.length === 0) return "You need at least one component to activate collisions.";
        if (rejectedComponents.length > 0) {
            Log.warn("Too many components for collision detection (more than " +
                WgCollisionAlgorithm.MAX_COMPONENTS + "). " + rejectedComponents.length + " were ignored.");
            console.warn("CatanaColision had to reject some components because there were too many." +
                " The maximum supported number of components is " + WgCollisionAlgorithm.MAX_COMPONENTS + ", and" +
                " " + (comps_promises.length + rejectedComponents.length) + " are available, meaning that" +
                " " + rejectedComponents.length + " components were rejected. Here are their names listed: " +
                rejectedComponents.map(v => v.name).join(", "));
            rejectedComponents.length = 0;
        }

        // With the structures initialized, now set up the CatanaCollision
        return Promise.all(comps_promises).then((comps) => {
            const debug = Debug ? this.DEBUG_NAME : undefined; // TODO remove the 'true'

            // Rendering stuff
            const camera = viewer.cameraTransformed;
            const target = new WgCanvas(context, viewer.width, viewer.height);
            viewer.renderer.domElement.parentElement!.appendChild(target.domElement);
            target.domElement.style.pointerEvents = "none";

            // Final preparation
            mode = this.getMode(mode);
            const renderingParams: WgCollisionAlgorithmRenderingParameters = { target, camera, radius, mode, color, opacity, thickness };
            const collisionParams: WgCollisionAlgorithmCollisionParameters = { lenience }
            const algorithm = new WgCollisionAlgorithm(context, comps, collisionParams, renderingParams, debug);

            // Voila!
            return new CatanaCollision(algorithm, comps, target.domElement);
        });
    }

    // RUNNING ---------------------------------------------------------------------------------------------------------

    /**
     * WARNING: This function has not been tested thoroughly. The text below describes the intended behavior
     *          This function is not used currently. To recalculate atom positions, simply Stop collision detection and Start again
     *
     * See this.updateComponent to understand how discrepancies between CPU atoms and GPU atoms can occur.
     * This method recalculates the atom positions of the given component and uploads those to the GPU so that they again match.
     */
    public async recalculate(c: AtomicComponent) {
        const oldError = this.algorithm.getError(c);
        return CatanaCollision.createComponentObject(c)
            .then((cop) => this.algorithm.resetComponent(cop))
            .then(() => {
                const newError = this.algorithm.getError(c);
                if (newError !== oldError) this.signals.errorChanged.dispatch(c, newError);
            });
    }

    /**
     * See this.updateComponent to understand how discrepancies between CPU atoms and GPU atoms can occur.
     * @returns The error (inaccuracy/discrepancy measure)
     */
    public getError(c: AtomicComponent): null | number {
        return this.algorithm.getError(c);
    }

    private static getMode(mode: "x" | "o" | WgRendCollisionShaderMode): WgRendCollisionShaderMode {
        switch (mode) {
            case "o": return WgRendCollisionShaderMode.O;
            case "x": return WgRendCollisionShaderMode.X;
            default: return mode;
        }
    }

    public async setSize(width: number, height: number) {
        return this.algorithm.setSize(width, height);
    }

    public setBoxVisible(visible: boolean) {
        this.boundingBoxVisible = visible;
    }

    public setCollisionParams(params: { lenience: number }) {
        this.algorithm.setCollisionUniforms(params);
    }

    public setRenderingParams(params: { radius?: number, mode?: "x" | "o" | WgRendCollisionShaderMode, color?: string, opacity?: number, lenience?: number, thickness?: number }) {
        this.algorithm.setRenderUniforms({
            radius: params.radius,
            color: params.color,
            opacity: params.opacity,
            mode: (params.mode !== undefined) ? CatanaCollision.getMode(params.mode) : undefined,
            lenience: params.lenience,
            thickness: params.thickness
        });
    }

    private forEachComponent(callback: (c: Component, atomStart: number, atomEnd: number) => void) {
        let start = 0;
        for (let i = 0; i < this._components.length; ++i) {
            const end = start + this._perComp_atomCount[i];
            callback(this._components[i], start, end);
            start += end;
        }
    }

    private dispatch(component: Component, start: number, end: number) {
        if (!this._collisions) {
            console.error("By this point, 'this._collisions' should have been not null");
            return;
        }
        this.signals.collisionChanged.dispatch({
            component: component,
            bitArray: this._collisions!.slice(start, end)
        });
    }

    /**
     * When a component's matrix is uptated (see this.updateComponent), we do not reupload all atom position to the GPU,
     * instead we upload the new matrix to the GPU and retransform the atoms belonging to this component.
     * This process, however, leads to imprecision in the collision detection, where the GPU atom positions being used
     * for detection do not match the GPU atom positions perfectly.
     *
     * To recalculate atom positions, simply Stop collision detection and Start again
     */
    private updateComponent(component: AtomicComponent) {
        const replace: boolean = !!this.processing;
        this.processing = { c: component, matrix: component.matrix.clone() };
        if (replace) {
            console.log("Old collision detection request was thrown away because a new one came");
            return;
        }
        if (!this.isProcessing) {
            this.isProcessing = true;
            this.process(this.processing).then(() => {
                this.isProcessing = false
            });
        }
    }

    // Makes the calls that will lead to the GPU doing work :)
    private async process(data: ProcessData) {
        while (this.processing) {
            this.processing = null;
            await this.algorithm.updateComponent(data.c, data.matrix);
            await this.update();
            this.signals.errorChanged.dispatch(data.c, this.algorithm.getError(data.c));
        }
    }

    /**
     * Download collision data from the GPU and compare with current collision data on the CPU
     * If there are any changes (per component), dispatch a collisionChanged signal (per component)
     */
    private async update() {
        if (this.signals.collisionChanged.getNumListeners() > 0) {
            const difference = this._collisions;
            this.algorithm.readAsBitArray().then((collisions) => {
                this._collisions = collisions;
                if (difference) {
                    difference.difference(this._collisions);
                    this.forEachComponent((c, start, end) => {
                        if (!difference.is0(start, end)) {
                            this.dispatch(c, start, end);
                        }
                    });
                } else {
                    console.warn("CatanaCollision updated (update()) without being started (start())");
                }
            });
        }
        WgPass.printOutputs(CatanaCollision.DEBUG_NAME);
    }

    /**
     * Performs the first iteration of the collision detection
     * It is recommended calling this method before performing any updates. Something may break otherwise
     */
    public async start() {
        this.algorithm.start().then(() => {
            if (this.signals.collisionChanged.getNumListeners() > 0) {
                this.algorithm.readAsBitArray().then((collisions) => {
                    this._collisions = collisions;
                    if (!this._collisions.is0()) {
                        this.forEachComponent((c, start, end) => {
                            this.dispatch(c, start, end);
                        });
                    }
                });
            }
        });
        WgPass.printOutputs(CatanaCollision.DEBUG_NAME);
    }

    // Renderer overrides ----------------------------------------------------------------------------------------------

    public clickLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    public downLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    public dragLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    public hover(x: number, y: number, s: Stage): boolean {
        return false;
    }

    //public render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget | null): void {
    private lastCamMatrix: null | Matrix4 = null;
    private lastCamProjMat: null | Matrix4 = null;

    /**
     * Renders the collision box and each collision as a marker
     */
    public render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, superSampleIndex: number) {
        if (this.boundingBoxVisible) {
            r.setRenderTarget(target);
            r.render(this.boundingBoxMesh, camera);
        }

        if (superSampleIndex !== -1) return;

        camera = camera.clone();
        camera.far = 10000;
        camera.near = 0.01;
        camera.updateProjectionMatrix();
        if (this.lastCamMatrix &&
            this.lastCamProjMat &&
            camera.matrix.equals(this.lastCamMatrix) &&
            camera.projectionMatrix.equals(this.lastCamProjMat)) {
            // If no matrix has changed since last time, there is no need to render again :)
            return;
        }
        this.lastCamMatrix = camera.matrix;
        this.lastCamProjMat = camera.projectionMatrix;
        this.algorithm.setRenderUniforms({camera});
        this.algorithm.draw();
    }

    //public setSize(width: number, height: number): void

    public upLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }
}

export default CatanaCollision;