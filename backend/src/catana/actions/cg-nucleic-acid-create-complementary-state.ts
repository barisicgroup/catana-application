import {CatanaState} from "./catana-state";
import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import CatanaRendering from "../webgl/catana-rendering";
import {getRepresentationByOid} from "../utils/catana-utils";
import {CgStructureRepresentation} from "../representation/structure/cg-structure-representation";

/**
 * CatanaState to create a complementary nucleic acid strand
 */
export class CgNucleicAcidCreateComplementaryState extends CatanaState {

    /**
     * Does nothing if the provided 'pickingProxy' is invalid (see 'CgNucleicAcidCreateComplementaryState.isValidProxy').
     * Otherwise, attempts to create a complementary strand to the hovered strand. In this case, this state is exited (using 'done()')
     * @returns False if the provided 'pickingProxy' is invalid. True otherwise
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (!CgNucleicAcidCreateComplementaryState.isValidProxy(pickingProxy)) {
            return false;
        }

        const component = pickingProxy.component;
        const strand = pickingProxy.cgNucleotide?.parentStrand ?? pickingProxy.cgNucleotideBond?.parentStrand;

        if (strand) {
            const newHelix = CatanaState.dnaFactory.buildComplementaryHelix(strand);
            if (newHelix.length > 0) {
                strand.parentStructure?.addNaStrand(newHelix);
            }

            if (component instanceof CgStructureComponent) {
                (component as CgStructureComponent).updateRepresentations(CatanaState.WHAT);
            }
        }

        if (stage.viewer.catanaRendering.unselect()) {
            stage.viewer.catanaRendering.render(stage.viewer);
        }

        this.done(stage);

        return true;
    }

    /**
     * Shows (visually) the hovered nucleotide if the 'pickingProxy' is valid.
     * Otherwise, do nothing
     * @returns False
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (CgNucleicAcidCreateComplementaryState.isValidProxy(pickingProxy)) {
            const repr = getRepresentationByOid(pickingProxy!.component, pickingProxy!.oid);
            const chainName = pickingProxy?.cgNucleotide?.parentStrand?.name ??
                pickingProxy?.cgNucleotideBond?.bondStartPolymer.name ??
                "";
            if (repr && repr instanceof CgStructureRepresentation) {
                stage.viewer.selectFilteredCol(CatanaRendering.SELECTION_COLORS.POSITIVE, { c: pickingProxy!.component, r: repr, f: ":" + chainName });
            } else {
                stage.viewer.smartSelect(pickingProxy?.component, undefined, undefined, CatanaRendering.SELECTION_COLORS.NEGATIVE);
            }
            stage.viewer.setCursor("pointer");
        } else {
            stage.viewer.unselect();
            stage.viewer.setCursor(null);
        }
        return false;
    }

    /**
     * Do nothing
     * @returns False
     */
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

    /**
     * Do nothing
     */
    public _enter(): void { }
    public _exit(): void { }

    private static isValidProxy(pickingProxy: PickingProxy | undefined): boolean {
        return pickingProxy != undefined &&
            (pickingProxy.cgNucleotide !== undefined || pickingProxy.cgNucleotideBond !== undefined);
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Create a complementary strand"],
            ["Hold shift", "Continue creating"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgNucleicAcidCreateComplementaryState;