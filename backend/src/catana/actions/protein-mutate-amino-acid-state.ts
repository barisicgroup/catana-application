import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import {getCursorType, setCursorType, setCursorTypeCustom} from "../utils/catana-utils";
import ProteinBaseState from "./protein-base-state";
import CatanaStateData from "./catana-state-data";
import StructureComponent from "../../component/structure-component";

/**
 * CatanaState to mutate amino acids
 */
class ProteinMutateAminoAcidState extends ProteinBaseState {
    protected stateData: CatanaStateData;

    constructor(data: CatanaStateData) {
        super();
        this.stateData = data;
        data.state = this;
    }

    /**
     * Performs the amino acid mutation based on the provided data (see 'this.stateData')
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (pickingProxy && pickingProxy.residue) {
            this.catanaProteinActions.mutateAminoAcid(stage, pickingProxy,
                this.stateData.aaName).then(() => {
                    if (pickingProxy.component instanceof StructureComponent) {
                        pickingProxy.component.rebuildRepresentations();
                    }
                });
            this.done(stage);
        }
        return false;
    }

    /**
     * Shows/Highlights (visually) if the hovered amino acid is valid for mutation
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (pickingProxy && pickingProxy.residue) {
            stage.viewer.smartSelect(undefined, undefined, pickingProxy);
            return true;
        }
        stage.viewer.unselect();
        return false;
    }

    public _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }

    public _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }

    public _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }

    public _keyDown(stage: Stage, key: string): boolean {
        return false;
    }

    public _enter(): void {
        this.prevCursorStyle = getCursorType();
        setCursorTypeCustom("change");
    }

    public _exit(): void {
        setCursorType(this.prevCursorStyle);
        this.stateData.state = null;
    }

    public stateDataUpdated() {
        // Do nothing
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Mutate amino acid"],
            ["Hold shift", "Continue mutating"],
            ["", "All-atom proteins only"]
        ];
    }
}

export default ProteinMutateAminoAcidState;