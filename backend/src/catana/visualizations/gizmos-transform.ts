import {Renderable} from "../webgl/catana-rendering";
import {
    Color,
    ConeGeometry,
    CylinderGeometry, Group, Matrix4, Mesh,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera, Quaternion,
    Scene, ShaderMaterial, TorusGeometry, Uniform, Vector2, Vector3,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {Signal} from "signals";
import CatanaShader from "../webgl/catana-shader";
import {
    getCWAngleBetween2DVectors,
    getIntersectionPointOfLineAndPlane,
    getPointOnLine1ClosestToLine2
} from "../utils/catana-utils";
import Stage from "../../stage/stage";

export type GizmoSignals = {
    materialChanged: Signal
};

export enum GizmoMode {
    NONE, TRANSLATION, ROTATION
}

type AxisType = null | "x" | "y" |"z";

interface DraggingData {
    draggedAxisType: AxisType;
    draggedAxis: Vector3;
    draggingPosition: Vector3;
    scenePosition: Vector3;
    sceneQuaternion: Quaternion;
    draggingDirectionNdc: Vector2;
    rotationAngleMultiplier: number;
}

type TranslationCallback = (deltaPosition: Vector3) => void;
type RotationCallback = (deltaRotation: Quaternion) => void;

/**
 * Manager for a Translation and a Rotation gizmo,
 * allowing for easy switching between the two of them
 */
export class GizmosTransform extends Renderable {
    private static readonly SCALE = 3;

    private static readonly COLOR_HEX_IDLE = 0xA0;
    private static readonly COLOR_HEX_ACTIVE = 0xFF;
    private static readonly COLOR_X_ACTIVE = GizmosTransform.COLOR_HEX_ACTIVE << 16;
    private static readonly COLOR_X_IDLE = GizmosTransform.COLOR_HEX_IDLE << 16;
    private static readonly COLOR_Y_ACTIVE = GizmosTransform.COLOR_HEX_ACTIVE << 8;
    private static readonly COLOR_Y_IDLE = GizmosTransform.COLOR_HEX_IDLE << 8;
    private static readonly COLOR_Z_ACTIVE = GizmosTransform.COLOR_HEX_ACTIVE;
    private static readonly COLOR_Z_IDLE = GizmosTransform.COLOR_HEX_IDLE;

    private readonly sceneNone: Scene;

    private readonly sceneTranslation: Scene;
    private readonly sceneRotation: Scene;

    private readonly componentsX: Object3D[];
    private readonly componentsY: Object3D[];
    private readonly componentsZ: Object3D[];

    private readonly materialX: ShaderMaterial;
    private readonly materialY: ShaderMaterial;
    private readonly materialZ: ShaderMaterial;

    private mode: GizmoMode = GizmoMode.NONE;
    private visible: boolean = false;
    private hovered: AxisType = null;
    private camera: null | PerspectiveCamera | OrthographicCamera = null;
    private draggingData: null | DraggingData;

    private _signals: GizmoSignals;

    private translationCallback: null | TranslationCallback = null;
    private rotationCallback: null | RotationCallback = null;

    constructor() {
        super();

        this._signals = {
            materialChanged: new Signal()
        };

        for (let i = 0; i < 3; ++i) {
            const uniforms = {
                index: new Uniform(this.renderableIndex),
                useWorldPos: new Uniform(false),
                data: new Uniform(new Vector3(i, 0, 0))
            };
            const shaderMaterial = new ShaderMaterial({
                uniforms: uniforms,
                vertexShader: CatanaShader.getDataVertShader(),
                fragmentShader: CatanaShader.getDataFragShader()
            });
            switch (i) {
                case 0:
                    this.materialX = shaderMaterial;
                    break;
                case 1:
                    this.materialY = shaderMaterial;
                    break;
                case 2:
                    this.materialZ = shaderMaterial;
                    break;
            }
        }

        this.componentsX = [];
        this.componentsY = [];
        this.componentsZ = [];

        const x = new Vector3(1, 0, 0);
        const y = new Vector3(0, 1, 0);
        const z = new Vector3(0, 0, 1);

        this.sceneNone = new Scene(); {
            // Add nothing to the scene
            this.sceneNone.scale.set(GizmosTransform.SCALE, GizmosTransform.SCALE, GizmosTransform.SCALE);
        }

        this.sceneTranslation = new Scene(); {
            const arrowX = this.createArrow(x);
            const arrowY = this.createArrow(y);
            const arrowZ = this.createArrow(z);
            this.sceneTranslation.add(arrowX, arrowY, arrowZ);
            this.componentsX.push(arrowX, arrowY, arrowZ);
            this.sceneTranslation.scale.set(GizmosTransform.SCALE, GizmosTransform.SCALE, GizmosTransform.SCALE);
        }

        this.sceneRotation = new Scene(); {
            const torusX = this.createTorus(x);
            const torusY = this.createTorus(y);
            const torusZ = this.createTorus(z);
            this.sceneRotation.add(
                torusX, torusY, torusZ);
            this.componentsX.push(torusX, torusY, torusZ);
            this.sceneRotation.scale.set(GizmosTransform.SCALE, GizmosTransform.SCALE, GizmosTransform.SCALE);
        }
    }

    public setMode(mode: GizmoMode) {
        this.mode = mode;
        this.setVisible(mode !== GizmoMode.NONE);
    }

    public setVisible(visible: boolean) {
        this.visible = visible;
        this.draggingData = null;
    }

    /**
     * Sets the position of this gizmo
     * @param position Initial position of the gizmo
     * @param positionChangedCallback Function to be called when the position changes
     */
    public setPosition(position: Vector3, positionChangedCallback?: TranslationCallback) {
        this.scene.position.copy(position);
        if (positionChangedCallback) this.translationCallback = positionChangedCallback;
    }

    /**
     * Sets the rotation of this gizmo
     * @param rotation Initial rotation of the gizmo
     * @param rotationChangedCallback Function to be called when the rotation changes
     */
    public setRotation(rotation: Quaternion, rotationChangedCallback?: RotationCallback) {
        this.scene.quaternion.copy(rotation);
        if (rotationChangedCallback) this.rotationCallback = rotationChangedCallback;
    }

    /**
     * @returns The 3D position of the center of this gizmo
     */
    public getPosition(): Vector3 {
        return this.scene.position.clone();
    }

    /**
     * @returns The 3D rotation of this gizmo around its center
     */
    public getRotation(): Quaternion {
        return this.scene.quaternion.clone();
    }

    /**
     * @param x Whether the X component of this gizmo should be visible
     * @param y Whether the Y component of this gizmo should be visible
     * @param z Whether the Z component of this gizmo should be visible
     */
    public setComponentVisible(x: boolean, y: boolean, z: boolean) {
        const groups: Array<Array<Object3D>> = [this.componentsX, this.componentsY, this.componentsZ];
        for (let i = 0; i < groups.length; ++i) {
            const g = groups[i];
            const visible = i == 0 ? x : (i == 1 ? y : z);
            for (let c of g) {
                c.visible = visible;
            }
        }
    }

    public get signals(): GizmoSignals {
        return this._signals;
    }

    private get scene(): Scene {
        switch (this.mode) {
            case GizmoMode.NONE: return this.sceneNone;
            case GizmoMode.TRANSLATION: return this.sceneTranslation;
            case GizmoMode.ROTATION: return this.sceneRotation;
            default: throw "No scene found for unexpected mode: " + this.mode;
        }
    }

    /**
     *
     * @param x Screen "X" coordinate
     * @param y Screen "Y" coordinate
     * @param renderer The Three.js renderer
     * @returns Which axis (X, Y, Z) the X and Y screen coordinates are pointing to
     */
    private getAxis(x: number, y: number, renderer: WebGLRenderer): AxisType {
        const pixel = this.getPixel(x, y, renderer);
        if (!pixel) return null;
        const axisIndex = pixel.x;
        switch (axisIndex) {
            case 0: return "x";
            case 1: return "y";
            case 2: return "z";
            default: throw "Unexpected axis index: " + axisIndex + " (expected integer in range [0,2])";
        }
    }

    private getAxisVector(axis: AxisType): Vector3 {
        if (axis === null) throw "Unexpected axis type: " + axis;
        return new Vector3(
            axis === "x" ? 1 : 0,
            axis === "y" ? 1 : 0,
            axis === "z" ? 1 : 0).applyEuler(this.scene.rotation);
    }

    private getDraggingPosition(axis: AxisType, camPos: Vector3, mouseWorldPos: Vector3): null | Vector3 {
        switch (this.mode) {
            case GizmoMode.TRANSLATION:
                const origin = this.scene.position.clone();
                return getPointOnLine1ClosestToLine2(
                    origin, this.getAxisVector(axis).add(origin),
                    camPos, mouseWorldPos);
            case GizmoMode.ROTATION:
                const planeOrigin = this.scene.position.clone();
                const planeNormal = this.getAxisVector(axis);
                return getIntersectionPointOfLineAndPlane(camPos, mouseWorldPos, planeOrigin, planeNormal);
            case GizmoMode.NONE:
                return null;
            default:
                throw "Unexpected mode: " + this.mode;
        }
    }

    clickLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    /**
     * Highlights the 3D axis (X, Y, or Z) being hovered
     */
    hover(x: number, y: number, s: Stage): boolean {
        if (!this.visible || !this.camera) return false;
        const axis = this.getAxis(x, y, s.viewer.renderer);
        if (this.hovered !== axis) {
            this.hovered = axis;
            s.viewer.requestRender();
        }
        return axis !== null;
    }

    /**
     * Starts a dragging action
     */
    public downLeft(x: number, y: number, s: Stage): boolean {
        if (!this.visible || !this.camera) return false;
        const axis = this.getAxis(x, y, s.viewer.renderer);
        if (!axis) return false;
        const draggingPosition = this.getDraggingPosition(
            axis, this.camera.position.clone(), s.getWorldPosition());
        if (draggingPosition != null) {
            const dragPosNdc = draggingPosition.clone().project(this.camera);
            const scenePosNdc = this.scene.position.clone().project(this.camera);
            const startDirNdc = dragPosNdc.clone().sub(scenePosNdc);
            let camDir = new Vector3();
            this.camera.getWorldDirection(camDir);
            const axisVector = this.getAxisVector(axis);
            this.draggingData = {
                draggedAxisType: axis,
                draggedAxis: axisVector,
                draggingPosition: draggingPosition,
                scenePosition: this.scene.position.clone(),
                sceneQuaternion: this.scene.quaternion.clone(),
                draggingDirectionNdc: new Vector2(startDirNdc.x, startDirNdc.y),
                rotationAngleMultiplier: camDir.dot(axisVector) > 0 ? -1 : 1
            };
        }
        return true;
    }

    /**
     * Stops a dragging action
     */
    public upLeft(x: number, y: number, s: Stage): boolean {
        if (this.draggingData) {
            this.draggingData = null;
            return true;
        }
        return false;
    }

    /**
     * Performs a drag.
     * Depending on the mode (translation or rotation), this will perform a translation or rotation
     */
    public dragLeft(x: number, y: number, s: Stage): boolean {
        if (!this.visible || !this.camera || !this.draggingData) return false;

        this.hovered = this.draggingData.draggedAxisType;
        const axis = this.draggingData.draggedAxis;

        if (this.mode === GizmoMode.TRANSLATION) {
            const origin = this.draggingData.scenePosition.clone();
            const pointOnAxis = getPointOnLine1ClosestToLine2(
                origin.clone(), origin.clone().add(axis),
                this.camera.position.clone(), s.getWorldPosition());
            const translation = pointOnAxis.sub(this.draggingData.draggingPosition);
            const newPos = translation.clone().add(this.draggingData.scenePosition);
            const deltaPos = this.scene.position.clone().negate().add(newPos);
            this.scene.position.copy(newPos);
            if (this.translationCallback) this.translationCallback(deltaPos);

        } else if (this.mode === GizmoMode.ROTATION) {
            const origin3dNdc = this.draggingData.scenePosition.clone().project(this.camera);
            const end3dNdc = s.getWorldPosition().project(this.camera);
            const dir3dNdc = end3dNdc.clone().sub(origin3dNdc);
            const dir2dNdc = new Vector2(dir3dNdc.x, dir3dNdc.y);

            //const angle = getCWNDCLineAngle(origin, end, this.camera) - getCWNDCLineAngle(origin, start, this.camera);
            let angle = getCWAngleBetween2DVectors(this.draggingData.draggingDirectionNdc, dir2dNdc);
            angle *= this.draggingData.rotationAngleMultiplier;

            // Make sure the angle remains clockwise regardless of the scene orientation
            //const camDir = new Vector3();
            //this.camera.getWorldDirection(camDir);
            //if (axis.dot(camDir) > 0) angle = -angle;

            if (!isNaN(angle)) {
                const rotation = new Quaternion().setFromAxisAngle(axis, angle);
                const newQuaternion = rotation.clone().multiply(this.draggingData.sceneQuaternion);
                const deltaQuaternion = this.scene.quaternion.clone().inverse().premultiply(newQuaternion);
                this.scene.quaternion.copy(newQuaternion);
                if (this.rotationCallback) this.rotationCallback(deltaQuaternion);
            } else {
                console.warn("Angle was NaN");
            }

        } else {
            throw "Unexpected gizmo mode: " + this.mode;
        }

        s.viewer.requestRender();
        return true;
    }

    private getColor(axis: "x" | "y" | "z"): Color {
        switch (axis) {
            case "x": return new Color(this.hovered === "x" ? GizmosTransform.COLOR_X_ACTIVE : GizmosTransform.COLOR_X_IDLE);
            case "y": return new Color(this.hovered === "y" ? GizmosTransform.COLOR_Y_ACTIVE : GizmosTransform.COLOR_Y_IDLE);
            case "z": return new Color(this.hovered === "z" ? GizmosTransform.COLOR_Z_ACTIVE : GizmosTransform.COLOR_Z_IDLE);
            default: throw "Unexpected axis: " + axis;
        }
    }

    private setMaterialUniformsByMode(mode: "color" | "data") {
        const ux = this.materialX.uniforms;
        const uy = this.materialY.uniforms;
        const uz = this.materialZ.uniforms;
        switch (mode) {
            case "color":
                const cx = this.getColor("x");
                const cy = this.getColor("y");
                const cz = this.getColor("z");
                ux.index.value = cx.r;
                ux.data.value = new Vector3(cx.g, cx.b, 1);
                uy.index.value = cy.r;
                uy.data.value = new Vector3(cy.g, cy.b, 1);
                uz.index.value = cz.r;
                uz.data.value = new Vector3(cz.g, cz.b, 1);
                break;
            case "data":
                ux.index.value = this.renderableIndex;
                ux.data.value = new Vector3(0, 0, 0);
                uy.index.value = this.renderableIndex;
                uy.data.value = new Vector3(1, 0, 0);
                uz.index.value = this.renderableIndex;
                uz.data.value = new Vector3(2, 0, 0);
                break;
            default:
                throw "Unexpected mode: " + mode;
        }
    }

    public render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, superSampleIndex: number): void {
        if (!this.visible) {
            this.camera = null;
            return;
        }
        this.camera = camera;
        const scene = this.scene;

        this.setMaterialUniformsByMode("data");
        r.setRenderTarget(Renderable.pixelwiseDataTarget);
        r.render(scene, camera);

        this.setMaterialUniformsByMode("color");
        r.setRenderTarget(target);
        r.render(scene, camera);
    }

    setSize(width: number, height: number): void {
        // Do nothing
    }

    private static readonly LENGTH = 10;
    private static readonly RADIUS = 0.5;
    private static readonly HEAD_LENGTH_MUL = 0.2;
    private static readonly HEAD_WIDTH_MUL = 2;
    private static readonly RADSEG = 32;
    private getMaterialFromAxis(axis: Vector3): ShaderMaterial {
        return axis.x === 1
            ? this.materialX
            : (axis.y === 1
                ? this.materialY
                : this.materialZ);
    }
    private createArrow(axis: Vector3): Object3D {
        const cone_length = GizmosTransform.LENGTH * GizmosTransform.HEAD_LENGTH_MUL;
        const cylinder_length = GizmosTransform.LENGTH - cone_length;
        const rotation = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis));

        const cylinder_g = new CylinderGeometry(GizmosTransform.RADIUS, GizmosTransform.RADIUS, cylinder_length, GizmosTransform.RADSEG);
        const cone_g = new ConeGeometry(GizmosTransform.RADIUS * GizmosTransform.HEAD_WIDTH_MUL, cone_length, GizmosTransform.RADSEG);

        const cylinder = new Mesh(cylinder_g, this.getMaterialFromAxis(axis));
        cylinder.applyMatrix4(new Matrix4().makeTranslation(0, cylinder_length / 2, 0).premultiply(rotation));

        const cone = new Mesh(cone_g, this.getMaterialFromAxis(axis));
        cone.applyMatrix4(new Matrix4().makeTranslation(0, cylinder_length + (cone_length / 2), 0).premultiply(rotation));

        const group = new Group();
        group.add(cylinder);
        group.add(cone);

        return group;
    }
    private createTorus(axis: Vector3): Object3D {
        const torus_g = new TorusGeometry(GizmosTransform.LENGTH, GizmosTransform.RADIUS, GizmosTransform.RADSEG, GizmosTransform.RADSEG);
        const torus = new Mesh(torus_g, this.getMaterialFromAxis(axis));
        torus.applyMatrix4(new Matrix4()
            .makeRotationFromQuaternion(new Quaternion()
                .setFromUnitVectors(new Vector3(0, 0, -1), axis)));

        return torus;
    }
}

export default GizmosTransform;