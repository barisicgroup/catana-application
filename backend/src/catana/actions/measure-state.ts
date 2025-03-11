import {CatanaState} from "../../catana";
import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";

/**
 * TODO: implement properly and incorporate into Catana!
 * CatanaState to measure distances between elements (atoms, residues, bonds, etc).
 */
class MeasureState extends CatanaState {

    protected _click_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        /*
        if (!pickingProxy) return false;
        stage.animationControls.move(pickingProxy?.position.clone());
        this.done(stage);
        return true;
        */

        /*
        if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
          const atom = pickingProxy.atom || pickingProxy.closestBondAtom
          const sc = pickingProxy.component as StructureComponent
          sc.measurePick(atom)
        } else {
          stage.measureClear()
        }
         */
        return false;
    }

    protected _down_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }
    protected _drag_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }
    protected _hover(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }
    protected _keyDown(stage: Stage, key: string): boolean {
        return false;
    }
    protected _up_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        return false;
    }

    protected _enter(): void {
    }
    protected _exit(): void {
    }

    protected _descriptions(): [string, string][] {
        return [
            //["Click", "Sets the clicked element (atom, residue...) as the rotation origin"]
        ];
    }
}

export default MeasureState;