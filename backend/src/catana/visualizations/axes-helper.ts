import {
    ConeGeometry,
    CylinderGeometry,
    Euler, Group, Mesh, MeshBasicMaterial, Object3D,
    OrthographicCamera,
    PerspectiveCamera, Quaternion,
    Scene, Vector3,
    WebGLRenderer
} from "three";

/**
 * Manages a Three.js Scene that contains three axes (X, Y, Z)
 */
export class CatanaAxesHelper {
    private readonly persp: PerspectiveCamera;
    private readonly ortho: OrthographicCamera;
    private cam: PerspectiveCamera | OrthographicCamera;

    private container: HTMLElement;
    private readonly renderer: WebGLRenderer;
    private readonly scene: Scene;
    private readonly axesHelper: Object3D;

    private static readonly AXES_HELPER_SIZE = 10;
    private static readonly CAMERA_Z = -45;

    constructor(container?: HTMLElement) {
        const width = 50; // TODO adjust?
        const height = 50; // TODO adjust?
        const near = 1; // TODO adjust?
        const far = 1000; // TODO adjust?
        const fov = 45; // TODO adjust?

        //this.persp = new PerspectiveCamera(fov, width/height, near, far)
        this.persp = new PerspectiveCamera(fov, width/height, 0.1, far)
        this.ortho = new OrthographicCamera(-width/2, width/2, height/2, -height/2, near, far);
        this.cam = this.persp;

        const ORIGIN = new Vector3(0, 0, 0);

        for (let cam of [this.persp, this.ortho]) {
            cam.position.z = CatanaAxesHelper.CAMERA_Z;
            cam.lookAt(ORIGIN);
        }

        this.axesHelper = CatanaAxesHelper.createAxesHelper();

        this.scene = new Scene();
        this.scene.add(this.axesHelper);

        this.renderer = new WebGLRenderer({alpha: true}); // Make background transparent
        this.renderer.setClearColor(0x000000, 0);

        if (container) {
            this.setContainer(container);
        }

        this.setSize(width, height);
    }

    private static createAxesHelper(): Object3D {
        const CYLINDER_LENGTH = this.AXES_HELPER_SIZE;
        const CYLINDER_RADIUS = CYLINDER_LENGTH / 8;
        const HEAD_LENGTH = CYLINDER_LENGTH / 3;
        const HEAD_RADIUS = CYLINDER_RADIUS * 2;
        const RADIUS_SEGMENTS = 10;

        const TRANSLATE_CYLINDER = CYLINDER_LENGTH / 2;
        const TRANSLATE_CONE = CYLINDER_LENGTH + (HEAD_LENGTH / 2);
        const GEOMETRY_DIRECTION = new Vector3(0, 1, 0);

        const cylinderGeometry = new CylinderGeometry(CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_LENGTH, RADIUS_SEGMENTS);
        const coneGeometry = new ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, RADIUS_SEGMENTS);

        const mr = new MeshBasicMaterial({color: 0xff0000});
        const mg = new MeshBasicMaterial({color: 0x00ff00});
        const mb = new MeshBasicMaterial({color: 0x0000ff});

        // Utility functions
        type n = number;
        const v = (x: n, y: n, z: n, s: n = 1) => new Vector3(x, y, z).multiplyScalar(s);
        const q = (x: n, y: n, z: n) => new Quaternion().setFromUnitVectors(GEOMETRY_DIRECTION, v(x, y, z));

        const axesHelper = new Group();
        for (let i of [{geometry: cylinderGeometry, translate: TRANSLATE_CYLINDER},
                       {geometry: coneGeometry,     translate: TRANSLATE_CONE}]) {
            axesHelper.add(this.createMesh(i.geometry, mr, v(1, 0, 0, i.translate), q(1, 0, 0)));
            axesHelper.add(this.createMesh(i.geometry, mg, v(0, 1, 0, i.translate), q(0, 1, 0)));
            axesHelper.add(this.createMesh(i.geometry, mb, v(0, 0, 1, i.translate), q(0, 0, 1)));
        }
        return axesHelper;
    }

    private static createMesh(g: CylinderGeometry | ConeGeometry, m: MeshBasicMaterial, t: Vector3, r: Quaternion): Mesh {
        const mesh = new Mesh(g, m);
        mesh.position.copy(t);
        mesh.setRotationFromQuaternion(r);
        return mesh;
    }

    setContainer(container: HTMLElement, resize?: boolean) {
        this.container = container;
        this.container.appendChild(this.renderer.domElement);
        //this.setSize(container.clientWidth, container.clientHeight);
    }

    setSize(width: number, height: number) {
        width = width < 1 ? 1 : width;
        height = height < 1 ? 1 : height;

        this.persp.aspect = width / height;
        this.ortho.left = -width / 2;
        this.ortho.right = width / 2;
        this.ortho.top = height / 2;
        this.ortho.bottom = -height / 2;

        this.persp.updateProjectionMatrix();
        this.ortho.updateProjectionMatrix();

        this.renderer.setPixelRatio(window.devicePixelRatio * 2); // *2 for supersampling
        this.renderer.setSize(width, height)

        this.render();
    }

    updateCamera(cam_ref: PerspectiveCamera | OrthographicCamera, rotation: Euler) {
        if (cam_ref instanceof PerspectiveCamera) {
            this.cam = this.persp;
            this.cam.fov = cam_ref.fov;
        } else {
            this.cam = this.ortho;
        }
        //cam.zoom = cam_ref.zoom;
        this.cam.up = cam_ref.up;
        this.axesHelper.rotation.copy(rotation);
        this.cam.updateProjectionMatrix();
    }

    render(cam_ref?: PerspectiveCamera | OrthographicCamera) {
        if (cam_ref) {
            this.cam = cam_ref instanceof PerspectiveCamera ? this.persp : this.ortho;
            //console.log(cam_ref)
            //console.log(this.cam);
        }
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.renderer.render(this.scene, this.cam);
    }
}

export default CatanaAxesHelper;