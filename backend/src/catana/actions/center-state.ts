import {CatanaState} from "../../catana";
import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";

/**
 * CatanaState to "focus" on an element (atom, residue, etc).
 * Focus means move the camera to a position and make that position the origin of the scene
 * That causes the rotations of the scene to occur around this point
 */
class CenterState extends CatanaState {

    /**
     * Does nothing if 'pickingProxy' is undefined
     * Sets the origin of the scene to the position stored in 'pickingProxy'
     * Then exits itself (by calling 'done')
     * @returns False if 'pickingProxy' is undefined, true otherwise
     */
    protected _click_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        if (!pickingProxy) return false;
        stage.animationControls.move(pickingProxy?.position.clone());
        this.done(stage);
        return true;
    }

    protected _hover(stage: Stage, pickingProxy?: PickingProxy): boolean {
        if (pickingProxy) stage.viewer.setCursor("crosshair");
        else stage.viewer.setCursor(null);
        return false;
    }

    /**
     * Does nothing
     * @returns False
     */
    protected _down_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }
    protected _drag_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }
    protected _keyDown(stage: Stage, key: string): boolean {
        return false;
    }
    protected _up_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }

    /**
     * Does nothing
     */
    protected _enter(): void {
    }
    protected _exit(): void {
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Sets the clicked element (atom, residue...) as the rotation origin"],
            ["Hold shift", "Continue setting"]
        ];
    }
}

export default CenterState;