import {
    AmbientLight,
    ConeGeometry,
    CylinderGeometry, DirectionalLight,
    Euler,
    Group,
    Mesh,
    MeshBasicMaterial, MeshStandardMaterial,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Quaternion,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    Uniform,
    Vector2,
    Vector3,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import CatanaShader from "../webgl/catana-shader";
import {Renderable} from "../webgl/catana-rendering";
import {Signal} from "signals";
import CircleSignals = DirectionSelector.CircleSignals;
import Stage from "../../stage/stage";

// Source: https://stackoverflow.com/questions/32494174/can-you-create-nested-classes-in-typescript
declare namespace DirectionSelector {
    type CircleSignals = { directionChanged: Signal };
    type DomeSignals = { directionChanged: Signal };
}

/**
 * Manages a HTMLCanvasElement that draws a 2D direction selector circle
 */
export class DirectionSelectorCircle {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _context: CanvasRenderingContext2D;

    private _dotTheta: number = Math.PI / 2;
    private _dotPhi: number = Math.PI / 2;

    // The 3D hemisphere that is synchronized with this 2D circle
    private _domeSibling: DirectionSelectorHemisphere;

    private readonly _params: { [id: string]: number } = {};

    private _signals: CircleSignals;

    constructor() {
        this._signals = {
            directionChanged: new Signal()
        };

        this._canvas = document.createElement("canvas");
        this._canvas.classList.add("DirectionSelectorCircle");

        this._context = this._canvas.getContext("2d") as CanvasRenderingContext2D;

        const scope = this;

        window.addEventListener("resize", () => {
            scope.update();
        });

        const interactionFunction = function(event: MouseEvent) {
            const rect = scope._canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const dir = scope.getDirection(x, y);
            if (dir === null) return;
            dir.normalize();
            scope.setDirection(dir, true);
            scope.draw();
        }

        let dragging: boolean = false;
        this._canvas.addEventListener("mousedown", event => {
            this.update();
            if (event.button === 0) { // Main button (usually left)
                dragging = true;
                interactionFunction(event);
            } else if (event.button === 2) { // Secondary button (usually right)
                this.resetDirection();
            }
        });
        this._canvas.addEventListener("mousemove", event => {
            this.update();
            if (event.button !== 0) return; // Allow only left mouse click
            if (dragging) interactionFunction(event);
        });
        this._canvas.addEventListener("mouseup", event => {
            this.update();
            if (event.button !== 0) return; // Allow only left mouse click
            dragging = false;
            interactionFunction(event);
        });

        // Prevent context menu
        this._canvas.addEventListener("contextmenu", event => {
            event.preventDefault();
            return false;
        });

        this._canvas.setAttribute("title", "Right click to reset");

        this.update();
    }

    public get domElement(): HTMLCanvasElement {
        return this._canvas;
    }

    /**
     * @param x The 2D X position in this circle
     * @param y The 2D Y position in this circle
     * @param normalized Whether the provided X and Y are normalized in the range [0,1]. Alternatively, they can be in screen coordinates
     * @returns The 3D vector that the provided 2D (X, Y) position represent
     */
    public getDirection(x: number, y: number, normalized: boolean = false): Vector3 {
        const p = this._params;

        let dir;
        if (normalized) {
            dir = new Vector2(x, y);
        } else {
            dir = new Vector2(x - p.cx, y - p.cy).divideScalar(p.radius)
        }
        if (dir.lengthSq() > 1) dir.normalize();

        x = dir.x;
        y = dir.y;
        const z = y;
        y = Math.sqrt(1 - (x*x + z*z));

        return new Vector3(x, y, z);
    }

    /**
     * The same as getDirection(), but with polar coordinates
     */
    private getDirectionPolar(angle: number, radius: number, normalized: boolean): Vector3 {
        const p = this._params;
        const x = radius * Math.cos(angle) + (normalized ? 0 : p.cx);
        const y = radius * Math.sin(angle) + (normalized ? 0 : p.cy);
        return this.getDirection(x, y, normalized);
    }

    /**
     * Returns angle in radians in the range [-pi, pi]
     */
    public get angleRad(): number {
        const p = this._params;
        return Math.atan2(p.zNormalized, p.xNormalized);
    }

    /**
     * @returns The distance between the selected point in this circle to its center, normalized in range [0,1]
     */
    public get radiusNormalized(): number {
        const p = this._params;
        if (p.radius === 0) return 0;
        const vec = new Vector2(p.x - p.cx, p.z - p.cy).divideScalar(p.radius);
        const lengthSq = vec.lengthSq();
        if (lengthSq > 1) return 1;
        return Math.sqrt(lengthSq);
    }

    /**
     * Sets the angle of the selected point in this circle around the circle's center
     * @param angleInRad Angle in radians
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public setAngleRad(angleInRad: number, sync: boolean = true) {
        const dir = this.getDirectionPolar(angleInRad, this.radiusNormalized, true);
        this.setDirection(dir, sync);
    }

    /**
     * Sets the distance of the selected point in this circle from the circle's center
     * @param radius Radius (either normalized in range [0,1] or in pixels, depending on the parameter 'normalized')
     * @param normalized Whether the provided radius is normalized in range [0,1]. Alternatively, it will be in pixels
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public setRadius(radius: number, normalized: boolean, sync: boolean = true) {
        const dir = this.getDirectionPolar(this.angleRad, radius, normalized);
        this.setDirection(dir, sync);
    }

    /**
     * Sets the 2D position of the selected point in this circle based on a given 3D direction vector
     * @param dir The 3D direction vector
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public setDirection(dir: Vector3, sync: boolean = true) {
        const theta = Math.acos(dir.z);
        const phi = Math.atan2(dir.y, dir.x);

        this._dotTheta = theta;
        this._dotPhi = phi;

        this.updateDirParams();

        this.draw();

        this._signals.directionChanged.dispatch();

        if (sync && this._domeSibling) {
            this._domeSibling.setDirection(dir, false);
        }
    }

    /**
     * Resets the direction in which this circle is pointing (i.e., at the center of the circle)
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public resetDirection(sync: boolean = true) {
        this.setDirection(DirectionSelector.UP, sync);
    }

    public get signals(): DirectionSelector.CircleSignals {
        return this._signals;
    }

    public update() {
        this._canvas.width = this._canvas.clientWidth;
        this._canvas.height = this._canvas.clientHeight;
        this.updateAllParams();
        this.draw();
    }

    private updateAllParams() {
        const p = this._params;

        p.W = this._canvas.width;
        p.H = this._canvas.height;
        p.size = Math.min(p.W, p.H);

        p.radius = p.size / 2;
        p.dotRadius = p.radius / 20;

        p.headLength = 0.125 * p.radius;
        p.headWidth = 0.125 * p.radius;

        p.cx = p.W / 2;
        p.cy = p.H / 2;

        p.top = p.cy - p.radius;
        p.right = p.cx + p.radius;
        p.bottom = p.cy + p.radius;
        p.left = p.cx - p.radius;

        this.updateDirParams();
    }

    private updateDirParams() {
        const p = this._params;
        p.xNormalized = Math.sin(this._dotTheta) * Math.cos(this._dotPhi);
        p.x = p.cx + p.xNormalized * p.radius;
        //const y = Math.sin(theta) * Math.sin(phi);
        p.zNormalized = Math.cos(this._dotTheta);
        p.z = p.cy + p.zNormalized * p.radius;
    }

    private draw() {
        const p = this._params;

        const c = this._context;
        c.clearRect(0, 0, p.W, p.H);

        // White circle (circle background)
        c.lineWidth = 2;
        c.fillStyle = "white";
        c.strokeStyle = "black";
        c.beginPath();
        c.arc(p.cx, p.cy, p.radius, 0, 2 * Math.PI);
        c.fill();
        c.stroke();

        // X axis
        c.strokeStyle = "#f00";
        c.beginPath();
        c.moveTo(p.left, p.cy);
        c.lineTo(p.right - p.headLength, p.cy);
        c.stroke();
        c.fillStyle = "#f00";
        c.beginPath();
        c.moveTo(p.right, p.cy);
        c.lineTo(p.right - p.headLength, p.cy - (p.headWidth / 2));
        c.lineTo(p.right - p.headLength, p.cy + (p.headWidth / 2));
        c.closePath();
        c.fill();

        // Z axis
        c.strokeStyle = "#0f0";
        c.beginPath();
        c.moveTo(p.cx, p.top);
        c.lineTo(p.cx, p.bottom - p.headLength);
        c.stroke();
        c.fillStyle = "#0f0";
        c.beginPath();
        c.moveTo(p.cx, p.bottom);
        c.lineTo(p.cx - (p.headWidth / 2), p.bottom - p.headLength);
        c.lineTo(p.cx + (p.headWidth / 2), p.bottom - p.headLength);
        c.closePath();
        c.fill();

        // Dot (direction)
        c.fillStyle = "black";
        c.beginPath();
        c.arc(p.x, p.z, p.dotRadius, 0, 2 * Math.PI);
        c.fill();
    }

    /**
     * Sets the dome/hemisphere that will be synchronized with this circle
     */
    public set domeSibling(dome: DirectionSelectorHemisphere) {
        this._domeSibling = dome;
    }
}

/**
 * Manages a Three.js Scene that contains a 3D direction selection hemisphere
 */
class DirectionSelectorHemisphere extends Renderable {
    private static readonly SCALE: number = 3;

    // The 2D circle that is synchronized with this 3D hemisphere
    private _circleSibling: DirectionSelectorCircle;

    private _domeMaterialPosition: ShaderMaterial;
    private _domeMaterialColor: MeshBasicMaterial;

    private _dome: Mesh;
    //private _circle: Object3D;
    private _arrow: Object3D;

    private _scene: Scene;

    private _direction: Vector3;
    private _rotation: Quaternion;
    private _visible: boolean = false;
    //private _dragging: boolean = false;

    private _signals: DirectionSelector.DomeSignals;

    constructor() {
        super();

        this._signals = {
            directionChanged: new Signal()
        }

        const domeMaterialPositionUniforms = {
            useWorldPos: new Uniform(true),
            index: new Uniform(this.renderableIndex),
            data: new Uniform(new Vector3(0, 0, 0)) // No data
        };
        this._domeMaterialPosition = new ShaderMaterial({
            uniforms: domeMaterialPositionUniforms,
            vertexShader: CatanaShader.getDataVertShader(),
            fragmentShader: CatanaShader.getDataFragShader(),
            depthTest: false,
            depthWrite: true,
            stencilWrite: false,
            //side: DoubleSide
        });

        this._domeMaterialColor = new MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.5,
            depthTest: true,
            depthWrite: false
        });

        const RADIUS = 1;
        const W_SEG = 32;
        const H_SEG = 32;
        const ROT_X = -Math.PI / 2;

        const dome_g = new SphereGeometry(RADIUS, W_SEG, H_SEG, 0, Math.PI, 0, Math.PI);
        dome_g.rotateX(ROT_X);
        //dome_g.scale(DirectionSelector.Dome.SCALE, DirectionSelector.Dome.SCALE, DirectionSelector.Dome.SCALE);
        this._dome = new Mesh(dome_g, this._domeMaterialPosition);

        //const circle_g = new SphereGeometry(RADIUS, W_SEG * 2, H_SEG * 2,
        //    0, 0, 0, 2 * Math.PI);
        //circle_g.rotateX(ROT_X);
        //circle_g.scale(DirectionSelector.Dome.SCALE, DirectionSelector.Dome.SCALE, DirectionSelector.Dome.SCALE);
        //this._circle = new Mesh(circle_g, this._binaryMaterial);

        const RAD = 0.5 / 10;
        const RADSEG = 16;

        this._arrow = new Group(); {
            const cylinder_g = new CylinderGeometry(RAD, RAD, 4/5, RADSEG);
            cylinder_g.translate(0, 4/10, 0);

            const cone_g = new ConeGeometry(RAD * 2, 1/5, RADSEG);
            cone_g.translate(0, 8/10 + 1/10, 0);

            const sphere_g = new SphereGeometry(RAD, RADSEG, RADSEG);

            //const mat = new MeshBasicMaterial({color: 0xFFFF00});
            const mat = new MeshStandardMaterial({color: 0xFFFF00});

            this._arrow.add(new Mesh(cylinder_g, mat));
            this._arrow.add(new Mesh(cone_g, mat));
            this._arrow.add(new Mesh(sphere_g, mat));
        }

        const ambientLight = new AmbientLight(0xFFFFFF, 0.25);
        const directionalLight = new DirectionalLight();
        directionalLight.target.position.set(-1, -1, -1);

        this._scene = new Scene();
        this._scene.add(this._dome);
        this._scene.add(this._arrow);
        this._scene.add(DirectionSelectorHemisphere.line("x", RAD / 2, RADSEG));
        this._scene.add(DirectionSelectorHemisphere.line("y", RAD / 2, RADSEG));
        this._scene.add(DirectionSelectorHemisphere.triangle("x", RAD * 2, RADSEG));
        this._scene.add(DirectionSelectorHemisphere.triangle("y", RAD * 2, RADSEG));
        this._scene.add(ambientLight);
        this._scene.add(directionalLight);
        this._scene.scale.set(DirectionSelectorHemisphere.SCALE, DirectionSelectorHemisphere.SCALE, DirectionSelectorHemisphere.SCALE);

        this.setSize(0, 0);
        this.resetDirection(true);
        this._rotation = new Quaternion();
    }

    /**
     * @param type "x" or "y" axis
     * @param rad Radius of the base of the cylinder
     * @param radseg Radial segments of the generated cylinder
     * @returns A cylinder (helper line) mesh of either the "X" or "Y" axis
     */
    private static line(type: "x" | "y", rad: number, radseg: number): Object3D {
        const height = 1.8; // Must be <= 2
        const geometry = new CylinderGeometry(rad, rad, height, radseg);
        if (type === "x") {
            geometry.rotateZ(Math.PI / 2);
            geometry.translate(-(2 - height) / 2, 0, 0);
        } else {
            geometry.rotateX(Math.PI / 2);
            geometry.translate(0, 0, -(2 - height) / 2);
        }
        return new Mesh(
            geometry,
            new MeshBasicMaterial({ color: type === "x" ? 0xFF0000 : 0x00FF00 }));
    }

    /**
     * @param type "x" or "y" axis
     * @param rad Radius of the base of the cone
     * @param radseg Radial segments of the generated cone
     * @returns A cone (arrow head) mesh of either the "X" or "Y" axis
     */
    private static triangle(type: "x" | "y", rad: number, radseg: number): Object3D {
        const height = 2 - 1.8; // 2 - lineHeight // TODO make lineHeight static constant
        const geometry = new ConeGeometry(rad, height, radseg);
        if (type === "x") {
            geometry.rotateZ(-Math.PI / 2);
            geometry.translate(1 - (height / 2), 0, 0);
        } else {
            geometry.rotateX(Math.PI / 2);
            geometry.translate(0, 0, 1 - (height / 2));
        }
        return new Mesh(
            geometry,
            new MeshBasicMaterial({color: type === "x" ? 0xFF0000 : 0x00FF00 }));
    }

    public setSize(width: number, height: number) {
        // Do nothing
    }

    /**
     * Click event.
     * If this hemisphere is clicked, make the direction pointer point to the 3D position where the click was performed
     */
    public clickLeft(x: number, y: number, s: Stage): boolean {
        if (!this._visible) return false;
        const dir = this.getDirection(x, y, s.viewer.renderer);
        if (dir === null) return false;
        this.setDirection(dir, true);
        return true;
    }

    public hover(x: number, y: number, s: Stage): boolean {
        /*if (!this._visible) return false;
        const dir = this.getDirection(x, y, s.viewer.renderer);
        if (this._dragging) {
            return this.clickLeft(x, y, s);
        } else {
            return dir !== null;
        }*/
        return false;
    }

    public downLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    public upLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    // TODO set direction on drag
    public dragLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    /**
     * Sets the 2D circle that will be synchronized with this hemisphere
     */
    public set circleSibling(circle: DirectionSelectorCircle) {
        this._circleSibling = circle;
    }

    public get signals(): DirectionSelector.DomeSignals {
        return this._signals;
    }

    /**
     * @param dir Direction to which the direction pointer of this hemisphere should point to
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public setDirection(dir: Vector3, sync: boolean = true) {
        if (dir.lengthSq() === 0) return;
        dir = dir.clone().normalize();
        this._arrow.setRotationFromQuaternion(new Quaternion().setFromUnitVectors(DirectionSelector.UP, dir));
        this._arrow.updateMatrixWorld();
        this._direction = dir;
        this._signals.directionChanged.dispatch();

        if (sync && this._circleSibling) {
            this._circleSibling.setDirection(dir, false);
        }
    }

    /**
     * Makes the direction pointer of this hemisphere point to the center of the hemisphere
     * @param sync Whether to synchronize the resulting 3D direction with a hemisphere visualization
     */
    public resetDirection(sync: boolean = true) {
        this.setDirection(DirectionSelector.UP, sync);
    }

    /**
     * @returns The direction in which the direction pointer of this hemisphere is pointing to
     */
    public get direction(): Vector3 {
        return this._direction.clone().applyQuaternion(this._rotation);
    }

    /**
     * Used when, e.g., the 3D hemisphere is clicked on the screen.
     * Using the screen's X and Y coordinates, we can find out where the hemisphere was clicked
     * X and Y coordinates are converted to a 3D position on the hemisphere where the click was performed
     * This function then returns the direction from the hemisphere center to this click 3D position
     * @param x The screen "X" coordinate
     * @param y The screen "Y" coordinate
     * @param renderer The Three.js renderer being used
     * @returns Based on X and Y screen coordinates, which 3D direction our direction pointer should point to in order
     *          to point towards the mouse 2D position
     */
    public getDirection(x: number, y: number, renderer: WebGLRenderer): null | Vector3 {
        return this._visible ? this.getPixel(x, y, renderer) : null;
    }

    /**
     * Sets the 3D position of the center of this hemisphere
     */
    public setPosition(p: Vector3) {
        //this._dome.position.copy(p);
        //this._dome.updateMatrixWorld();
        this._scene.position.copy(p);
    }

    /**
     * Sets the 3D rotation of this hemisphere around its center
     */
    public setRotation(rot: Quaternion | Vector3) {
        let quat: Quaternion;
        if (rot instanceof Vector3) {
            quat = new Quaternion().setFromUnitVectors(DirectionSelector.UP, rot.clone().normalize());
        } else {
            quat = rot;
        }
        this._rotation = quat.clone();
        const r = new Euler().setFromQuaternion(quat);
        //this._dome.rotation.copy(r);
        //this._dome.updateMatrixWorld();
        this._scene.rotation.copy(r);
    }

    public setVisible(v: boolean) {
        this._visible = v;
        //this._dragging = false;
    }

    public render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, superSampleIndex: number) {
        if (!this._visible) return;

        // Deactivated because it was causing depth issues (always behind other objects)
        //camera = camera.clone();
        //camera.near = 0.001;
        //camera.far = 100000;
        //camera.updateProjectionMatrix();

        // Dome position
        this._dome.material = this._domeMaterialPosition;
        r.setRenderTarget(Renderable.pixelwiseDataTarget);
        r.render(this._dome, camera);

        // Whole scene
        this._dome.material = this._domeMaterialColor;
        r.setRenderTarget(target);
        r.render(this._scene, camera);
    }
}

/**
 * Manager for a (DirSel circle, DirSel hemisphere) pair
 */
export default class DirectionSelector {
    public static readonly UP = new Vector3(0, 1, 0);

    private readonly _circle: DirectionSelectorCircle;
    private readonly _hemisphere: DirectionSelectorHemisphere;

    constructor() {
        this._circle = new DirectionSelectorCircle();
        this._hemisphere = new DirectionSelectorHemisphere();

        this._circle.domeSibling = this._hemisphere;
        this._hemisphere.circleSibling = this._circle;
    }

    public get circle(): DirectionSelectorCircle {
        return this._circle;
    }

    public get hemisphere(): DirectionSelectorHemisphere {
        return this._hemisphere;
    }

    public setScreenSize(width: number, height: number) {
        this._hemisphere.setSize(width, height);
    }
}