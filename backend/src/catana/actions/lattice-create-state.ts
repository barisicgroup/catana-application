import {CatanaState} from "./catana-state";
import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import {DummyHoneycombLattice} from "../nanomodeling/lattices/dummy-honeycomb-lattice";
import {DummySquareLattice} from "../nanomodeling/lattices/dummy-square-lattice";
import {Matrix4, Quaternion, Vector3} from "three";
import LatticeComponent from "../component/lattice-component";
import MultiObjectsStorage from "../utils/multi-objects-storage";

class CreateLatticeStateData {
    startPos: Vector3;
    dummyLattice: DummySquareLattice | DummyHoneycombLattice;
    dummyComponent: LatticeComponent;
    constructor(startPos: Vector3, dummyLattice: DummySquareLattice | DummyHoneycombLattice, dummyComponent: LatticeComponent) {
        this.startPos = startPos;
        this.dummyLattice = dummyLattice;
        this.dummyComponent = dummyComponent;
    }
}

/**
 * CatanaState to create a (square or honeycomb) lattice
 */
export class CreateLatticeState extends CatanaState {

    // Quaternions that mirror around the X and Y axes
    private static readonly QUAT_X: Quaternion = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
    private static readonly QUAT_Y: Quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

    private _createHoneycombLattice: boolean;

    constructor(createHoneycombLattice: boolean) {
        super();
        this._createHoneycombLattice = createHoneycombLattice;
    }

    private data: CreateLatticeStateData | null = null;

    _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        return false;
    }

    _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        return false;
    }

    /**
     * Starts the creation of a lattice
     */
    _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        let startPos, dummyLattice;

        startPos = stage.getWorldPosition();

        dummyLattice = this._createHoneycombLattice
            ? new DummyHoneycombLattice(1, 1, CatanaState.dnaFactory.dnaForm.doubleHelixDiameter, startPos)
            : new DummySquareLattice(1, 1, CatanaState.dnaFactory.dnaForm.doubleHelixDiameter, startPos);

        const comp = stage.addComponentFromObject(new MultiObjectsStorage([dummyLattice]));
        stage.defaultFileRepresentation(comp[0]);

        this.data = new CreateLatticeStateData(startPos, dummyLattice, comp[0] as LatticeComponent);

        return true;
    }

    /**
     * Finishes the creation of a lattice and requests an autoexit
     */
    _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (!this.data) return false;

        let lattice = this.data.dummyLattice.toFunctionalLattice();
        const comp = stage.addComponentFromObject(new MultiObjectsStorage([lattice]));
        stage.defaultFileRepresentation(comp[0]);

        stage.removeComponent(this.data.dummyComponent);

        if (!this.done(stage)) this.clearData();

        return true;
    }

    /**
     * Updates the lattice currently being created
     */
    _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        this.update(stage);
        return true;
    }

    /**
     * If "Escape" is pressed, the creation of a lattice is canceled
     */
    _keyDown(stage: Stage, key: string): boolean {
        if (this.data && key === "Escape") {
            this.clearData();
            return true;
        }
        return false;
    }

    private update(stage: Stage) {
        if (!this.data) return;

        let start: Vector3 = this.data.startPos.clone();
        let end: Vector3 = stage.getWorldPosition();
        //const end: Vector3 = getStageCameraPointOnPlane(stage, start); // TODO: implement this?

        const quat = stage.viewerControls.rotation.clone();
        const quatInv = quat.clone().conjugate();

        //let rotInv = new Matrix4();
        //rotInv.getInverse(stage.viewer.rotationGroup.matrix);
        let camPos: Vector3 = stage.viewer.camera.position.clone()
            //.applyMatrix4(rotInv)
            .applyQuaternion(quatInv)
            .sub(stage.viewer.translationGroup.position);

        let camUp: Vector3 = stage.viewer.camera.up.clone()
            .applyQuaternion(quatInv)
            //.sub(stage.viewer.translationGroup.position)
            .normalize();

        let camDir: Vector3 = camPos.clone().sub(start).normalize();
        let camRight: Vector3 = camUp.clone().cross(camDir).normalize();

        end.sub(start);

        let isPointingUp: boolean = end.dot(camUp) >= 0;
        let heightLength: number = end.clone().projectOnVector(camUp).length();

        let isPointingRight: boolean = end.dot(camRight) >= 0;
        let widthLength: number = end.clone().projectOnVector(camRight).length();

        // If necessary, rotate the lattice 180 degrees around the X or Y axis
        let latticeQuat = quatInv.clone();
        if (!isPointingUp) latticeQuat.multiply(CreateLatticeState.QUAT_X);
        if (isPointingRight) latticeQuat.multiply(CreateLatticeState.QUAT_Y);

        this.data.dummyLattice.resizeFromLengths(widthLength, heightLength);
        this.data.dummyLattice.matrix
            .makeRotationFromQuaternion(latticeQuat)
            .premultiply(new Matrix4().makeTranslation(start.x, start.y, start.z));

        //this.data.dummyComponent.setRotation(latticeQuat);
        this.data.dummyComponent.updateRepresentations(CatanaState.WHAT);
        //this.data.dummyComponent.updateRepresentationMatrices();
        this.data.dummyComponent.updateName();
    }

    _enter(): void {
    }

    _exit(): void {
        this.clearData();
    }

    private clearData() {
        if (this.data) {
            this.data.dummyComponent.stage.removeComponent(this.data.dummyComponent);
        }
        this.data = null;
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Drag", "Create lattice"],
            ["Hold shift", "Continue creating"]
        ];
    }
}

export default CreateLatticeState;