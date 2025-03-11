import {CatanaState} from "./catana-state";
import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";
import {GizmoMode} from "../visualizations/gizmos-transform";
import {Quaternion, Vector3} from "three";
import {getStageCameraPointOnPlane} from "../utils/catana-utils";
import {Log} from "../../globals";
import CatanaStateData from "./catana-state-data";
import StructureComponent from "../../component/structure-component";
import CgStructureComponent from "../component/cg-structure-component";
import Component from "../../component/component";

class MoveStateClickData {
    stage: Stage;
    pickingProxy: PickingProxy;

    constructor(stage: Stage, pickingProxy: PickingProxy) {
        this.stage = stage;
        this.pickingProxy = pickingProxy;
    }
}

class MoveStateDragData {
    initialPos: Vector3;
    lastPos: Vector3;
    pickingProxy: PickingProxy;
    x: number;
    y: number;

    constructor(initialPos: Vector3, pickingProxy: PickingProxy, x: number, y: number) {
        this.initialPos = initialPos;
        this.lastPos = initialPos;
        this.pickingProxy = pickingProxy;
        this.x = x;
        this.y = y;
    }
}

type Mode = "translate" | "rotate";

/**
 * CatanaState to move (translate or rotate) components
 */
class MoveState extends CatanaState {

    private readonly mode: Mode;
    private readonly stateData: CatanaStateData;

    private clickData: MoveStateClickData | null = null;
    private dragData: MoveStateDragData | null = null;

    private blockUpdate: boolean = false;
    private readonly onComponentMatrixChangedFun = () => {
        if (this.blockUpdate) return;
        // TODO: Don't just exit... update the stage.catanaVisManager.transformGizmo's position and rotation
        this.exit();
    }

    public constructor(mode: Mode, stateData: CatanaStateData) {
        super();
        this.mode = mode;
        this.stateData = stateData;
        stateData.state = this;
    }

    public stateDataUpdated() {
        const stage = this.clickData?.stage;
        if (!stage) return;
        if (this.stateData.transformOrientation === "global") {
            stage.catanaVisManager.gizmoTransform.setRotation(new Quaternion());
            return;
        }

        const comp = this.clickData?.pickingProxy?.component;
        if (!comp) return;

        stage.catanaVisManager.gizmoTransform.setRotation(this.getRotation(comp));
    }

    private getRotation(comp: Component): Quaternion {
        const to = this.stateData.transformOrientation;
        if (to === "global") return new Quaternion();
        switch (this.stateData.transformOrientation) {
            case "local":
                return comp.quaternion;
            case "principal":
                if (comp instanceof StructureComponent || comp instanceof CgStructureComponent) {
                    const s = comp instanceof StructureComponent ? comp.structure : comp.cgStructure;
                    const pc = s.getPrincipalAxes();
                    return new Quaternion().setFromRotationMatrix(pc.getBasisMatrix()).premultiply(comp.quaternion);
                } else {
                    Log.warn("Unable to use Principal coordinates because selected component does not have atom " +
                        "information. Using Component (Local) coordinates instead");
                    this.stateData.transformOrientation = "local";
                    return comp.quaternion;
                }
            default:
                Log.error("Unexpected transform orientation '" + this.stateData.transformOrientation + "'. Reverting to 'global'");
                return new Quaternion();
        }
    }

    /**
     * If a component is clicked, show a Translation or Rotation gizmo on the clicked 3D position.
     * Otherwise, hide the gizmos
     */
    _click_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        // If nothing is clicked, deactivate the gizmo
        if (pickingProxy === undefined) {
            this.clearData();
            return false;
        } else if(pickingProxy.component.locked){
            Log.info("Component is locked.")
            return false;
        }

        // Some setting up
        const comp = pickingProxy.component;

        this.activate(this.mode, new MoveStateClickData(
            stage, pickingProxy
        ));

        // Position
        stage.catanaVisManager.gizmoTransform.setPosition(pickingProxy.position.clone(), (deltaPos) => {
            //console.log("pos="+pos.x+","+pos.y+","+pos.z+"|"+newPos.x+","+newPos.y+","+newPos.z);
            this.blockUpdate = true;
            comp.setPosition(comp.position.clone().add(deltaPos));
            this.blockUpdate = false;
        });

        // Rotation
        stage.catanaVisManager.gizmoTransform.setRotation(this.getRotation(comp), (deltaRot) => {
            const posGizmo = stage.catanaVisManager.gizmoTransform.getPosition();

            // Calculate position
            const rotCenter = comp.getCenter();//comp.position.clone();
            const rotPoint = posGizmo.clone().sub(rotCenter);
            const newRotPoint = rotPoint.clone().applyQuaternion(deltaRot);
            const deltaPos = rotPoint.sub(newRotPoint);
            //const newPos = this.clickData!.posGizmo.clone().add(deltaPos);

            // Update rotation and position
            this.blockUpdate = true;
            comp.setRotation(comp.quaternion.clone().premultiply(deltaRot));
            comp.setPosition(comp.position.clone().add(deltaPos));
            //stage.catanaVisManager.gizmoTransform.setRotation(newRot);
            //stage.catanaVisManager.gizmoTransform.setPosition(posGizmo);
            this.blockUpdate = false;
        });

        return true;
    }

    _hover(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (pickingProxy) stage.viewer.setCursor("grab");
        else stage.viewer.setCursor(null);
        return false;
    }

    /**
     * Sets up the "dragging" movement mode
     */
    _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (pickingProxy) {
            const pos = pickingProxy.position.clone();
            const mousePos = stage.mouseObserver.canvasPosition;
            this.dragData = new MoveStateDragData(pos, pickingProxy, mousePos.x, mousePos.y);
            stage.viewer.setCursor("grabbing");
            return true;
        }
        return false;
    }

    /**
     * Stops the "dragging" movement mode
     */
    _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        this._hover(stage, pickingProxy); // TODO: Not very elegant.
        if (this.dragData) {
            this.dragData = null;
            return true;
        }
        return false;
    }

    /**
     * Performs the "dragging" movement
     */
    _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (this.dragData) {
            this.clearClickData();

            if (this.mode === "translate") {
                //const linePos1 =
                const planePos = this.dragData.initialPos.clone();
                //const planeNormal =
                //const curPos = getIntersectionPointOfLineAndPlane(linePos1, linePos2, planePos, planeNormal);
                const curPos = getStageCameraPointOnPlane(stage, planePos);
                const delta = curPos.clone().sub(this.dragData.lastPos);

                const comp = this.dragData.pickingProxy.component;
                comp.setPosition(delta.add(comp.position));
                this.dragData.lastPos = curPos;

            } else { // if (this.mode === "rotate) {
                const mousePos = stage.mouseObserver.canvasPosition;
                const dx = mousePos.x - this.dragData.x;
                const dy = mousePos.y - this.dragData.y;

                const camera = stage.viewer.cameraTransformed;
                const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
                const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

                const rot = new Quaternion().setFromAxisAngle(up, dx * 0.01)
                    .multiply(new Quaternion().setFromAxisAngle(right, -dy * 0.01));

                const rotCenter = this.dragData.pickingProxy.component.getCenter();
                const rotPoint = this.dragData.initialPos.clone().sub(rotCenter);
                const newRotPoint = rotPoint.clone().applyQuaternion(rot);
                const deltaPos = rotPoint.sub(newRotPoint);

                // Update rotation and position
                const comp = this.dragData.pickingProxy.component;
                comp.setRotation(comp.quaternion.clone().premultiply(rot));
                comp.setPosition(comp.position.clone().add(deltaPos));

                // dragData.lastPos UNUSED for rotation!

                this.dragData.x = mousePos.x;
                this.dragData.y = mousePos.y;
            }

            return true;
        }
        return false;
    }

    _keyDown(stage: Stage, key: string): boolean {
        return false;
    }

    _enter(): void {
    }

    _exit(): void {
        this.stateData.state = null;
        this.clearData();
    }

    /**
     * Configures and shows the movement gizmo
     */
    private activate(_mode: Mode, data: MoveStateClickData) {
        if(!data.pickingProxy.component) { 
            return; // TODO: hotfix
        }

        const mode: GizmoMode = _mode === "translate" ? GizmoMode.TRANSLATION : GizmoMode.ROTATION;
        data.stage.catanaVisManager.gizmoTransform.setMode(mode);
        data.stage.catanaVisManager.gizmoTransform.setVisible(true);

        const comp = data.pickingProxy.component;
        comp.signals.matrixChanged.add(this.onComponentMatrixChangedFun);

        this.clickData = data;

        data.stage.viewer.requestRender();
    }

    private clearClickData() {
        if (this.clickData) {
            this.clickData.stage.catanaVisManager.gizmoTransform.setVisible(false);
            this.clickData.stage.catanaVisManager.gizmoTransform.setMode(GizmoMode.NONE);
            this.clickData.pickingProxy?.component?.signals.matrixChanged.remove(this.onComponentMatrixChangedFun); // TODO: hotfix
            this.clickData.stage.viewer.requestRender();
        }
        this.clickData = null;
    }

    private clearData() {
        this.clearClickData();
        this.dragData = null;
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Drag", (this.mode === "translate" ? "Move" : "Rotate") + " structure"],
            ["Click", "Show " + (this.mode === "translate" ? "translation" : "rotation") + " tool on structure"]
        ];
    }
}

export default MoveState;