import {Renderable} from "../webgl/catana-rendering";
import Stage from "../../stage/stage";
import {
    GridHelper,
    Mesh,
    MeshBasicMaterial, Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Scene, SphereGeometry, Vector3,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {
    getCameraPointOnPlane
} from "../utils/catana-utils";

/**
 * TODO currently unused
 */
class InteractionPlane extends Renderable {

    private readonly scene: Scene;
    private readonly plane: Object3D;
    private readonly sphere: Object3D;
    private camera: PerspectiveCamera | OrthographicCamera | null;
    //private planeNormal: Vector3;
    //private planeAlwaysInvisible: boolean = true;

    constructor() {
        super();

        { // Plane
            const spacing = 10; // in Angstroms
            const divisions = 50;
            const size = divisions * spacing; // in Angstroms
            this.plane = new GridHelper(size, divisions, 0xaaaaaa, 0x444444);
            //this.planeNormal = new Vector3(0, 1, 0);
        }

        { // Sphere
            const g = new SphereGeometry(1, 16, 16);
            const m = new MeshBasicMaterial({color: 0xffffff});
            this.sphere = new Mesh(g, m);
        }

        this.scene = new Scene();
        this.scene.add(this.plane, this.sphere);

        this.camera = null;
    }

    clickLeft(x: number, y: number, s: Stage): boolean {
        // Do nothing
        return false;
    }

    hover(x: number, y: number, s: Stage): boolean {
        if (!this.camera) return false;

        const intersectionPoint = this.getWorldPosition(s);

        if (!intersectionPoint) {
            this.sphere.visible = false;
            return false;
        }

        this.sphere.visible = true;
        this.sphere.position.copy(intersectionPoint);
        //s.viewer.requestRender();

        return false;
    }

    downLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    upLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    dragLeft(x: number, y: number, s: Stage): boolean {
        return false;
    }

    render(r: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, superSampleIndex: number): void {
        this.camera = camera;

        // Align plane with camera direction
        //this.updateLargestComponent();
        const camDir = new Vector3();
        camera.getWorldDirection(camDir);
        //this.planeNormal.copy(camDir.negate().normalize());
        /*const up = camera.up.clone().normalize();
        const right = camDir.clone().cross(up).normalize();
        const matrix = getMatrix4FromMatrix3(getMatrix3FromColumnVectors(right, camDir, up));
        this.plane.setRotationFromMatrix(matrix);

        if (this.planeAlwaysInvisible) this.plane.visible = false;
        r.setRenderTarget(target);
        r.render(this.scene, camera);*/
    }

    setSize(width: number, height: number): void {
        // Do nothing
    }

    public getWorldPosition(s: Stage): Vector3 {
        const worldPos = s.mouseObserver.getWorldPosition();
        if (!this.camera) return worldPos;
        const planePos = new Vector3(0, 0, 0);
        return getCameraPointOnPlane(this.camera, worldPos, planePos);
    }

    /*public setPlaneVisibility(visible: boolean) {
        this.planeAlwaysInvisible = visible;
    }*/
    
    /*private getLargestComponent(): "x" | "y" | "z" {
        const camDir = new Vector3();
        this.camera!.getWorldDirection(camDir);
        camDir.set(Math.abs(camDir.x), Math.abs(camDir.y), Math.abs(camDir.z));
        if (camDir.x > camDir.y) {
            if (camDir.x > camDir.z) return "x";
            else return "z";
        } else if (camDir.z > camDir.y) return "z";
        else return "y";
    }

    private updateLargestComponent() {
        const largestComponent = this.getLargestComponent();
        const DEG90 = Math.PI * 0.5;
        switch (largestComponent) {
            case "x":
                this.planeNormal = new Vector3(1, 0, 0);
                this.plane.setRotationFromAxisAngle(new Vector3(0, 0, 1), DEG90);
                break;
            case "y":
                this.planeNormal = new Vector3(0, 1, 0);
                this.plane.setRotationFromAxisAngle(new Vector3(), 0);
                break;
            case "z":
                this.planeNormal = new Vector3(0, 0, 1);
                this.plane.setRotationFromAxisAngle(new Vector3(1, 0, 0), DEG90);
                break;
            default:
                this.planeNormal = new Vector3(0, 0, 0);
                this.plane.visible = false;
                this.sphere.visible = false;
                return;
        }
        this.plane.visible = true;
    }*/
}

export default InteractionPlane;