import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import {getComplementaryBase, oneLetterCodeToNucleobaseType} from "../data_model/types_declarations/monomer-types";
import {CatanaState} from "./catana-state";
import CatanaStateData from "./catana-state-data";
import CatanaRendering from "../webgl/catana-rendering";

/**
 * CatanaState to change the type of a nucleic acid (A, C, T, G, U)
 */
export class CgNucleicAcidChangeTypeState extends CatanaState {
    private readonly _stateData: CatanaStateData;

    constructor(stateData: CatanaStateData) {
        super();
        this._stateData = stateData;
        stateData.state = this;
    }

    /**
     * If given a valid 'pickingProxy' with a 'cgNucleotide' and a valid nucleotide name in the 'stateData',
     * change the type of the 'cgNucleotide' to the type provided in the 'stateData'.
     * Otherwise, do nothing.
     * @returns True if the conditions above are met. False otherwise
     */
    protected _click_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (!pickingProxy || !pickingProxy.cgNucleotide || this._stateData.ntName.length === 0) {
            return false;
        }

        const np: CgNucleotideProxy = pickingProxy.cgNucleotide;
        const thisNbType = oneLetterCodeToNucleobaseType(this._stateData.ntName);
        np.nucleobaseType = thisNbType;

        const compNp = np.pairedNucleotide;
        if (this._stateData.changeAlsoComplementary && compNp) {
            compNp.nucleobaseType = getComplementaryBase(thisNbType, np.parentStrand.naType);
        }

        if (pickingProxy.component instanceof CgStructureComponent) {
            (pickingProxy.component as CgStructureComponent).updateRepresentations(CatanaState.WHAT);
        }

        if (stage.viewer.catanaRendering.unselect()) {
            stage.viewer.catanaRendering.render(stage.viewer);
        }

        return true;
    }

    /**
     * Show (visually) the hovered 'cgNucleotide'
     * @returns False
     */
    protected _hover(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (pickingProxy && pickingProxy.cgNucleotide) {
            stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.NEUTRAL);
            stage.viewer.setCursor("pointer");
        } else if (stage.viewer.catanaRendering.unselect()) {
            stage.viewer.unselect();
            stage.viewer.setCursor(null);
        }
        return false;
    }

    /**
     * Does nothing
     * @returns False
     */
    protected _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }
    protected _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }
    protected _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        return false;
    }
    protected _keyDown(stage: Stage, key: string): boolean {
        return false;
    }

    /**
     * Does nothing
     */
    protected _enter(): void { }
    public stateDataUpdated() { }

    /**
     * Sets the state data to null;
     */
    protected _exit(): void {
        this._stateData.state = null;
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Change nucleobase type"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgNucleicAcidChangeTypeState;