import {CatanaState} from "./catana-state";
import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import CatanaRendering from "../webgl/catana-rendering";
import {CgStructureElementType, StructureElementType} from "../data_model/types_declarations/element-type";
import {getCursorType, getRepresentationByOid, setCursorType, setCursorTypeCustom} from "../utils/catana-utils";
import {CgStructureRepresentation} from "../representation/structure/cg-structure-representation";

/**
 * CatanaState to remove a structure element (see StructureElementType)
 */
export class CgRemoveState extends CatanaState {
    private _removalType: CgStructureElementType;
    private _prevCursorStyle: string;

    constructor(removalType: CgStructureElementType = StructureElementType.RESIDUE) {
        super();

        this._removalType = removalType;
    }

    public get removalType(): CgStructureElementType {
        return this._removalType;
    }

    public set removalType(type: CgStructureElementType) {
        this._removalType = type;
    }

    private static canRemove(p: PickingProxy | undefined): boolean {
        return p !== undefined &&
            (p.cgNucleotide !== undefined || p.cgAminoAcid !== undefined || p.cgNucleotideBond !== undefined);
    }

    /**
     * Remove the clicked element if possible and autoexits
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (!CgRemoveState.canRemove(pickingProxy)) {
            return false;
        }

        const component = pickingProxy.component;

        if (pickingProxy.cgNucleotide !== undefined) {
            const parentStrand = pickingProxy.cgNucleotide.parentStrand;
            if (this._removalType === StructureElementType.RESIDUE) {
                const strToAdd = parentStrand.breakAtNucleotide(pickingProxy.cgNucleotide);
                if (strToAdd !== undefined) {
                    parentStrand.parentStructure!.addNaStrand(strToAdd);
                }
            } else {
                parentStrand.parentStructure?.removeNaStrand(parentStrand);
            }
        } else if (pickingProxy.cgNucleotideBond !== undefined) {
            const nts = pickingProxy.cgNucleotideBond.nucleotides;
            const parentStrand = nts[0]?.parentStrand;

            if (this._removalType === StructureElementType.RESIDUE) {
                if (parentStrand !== undefined) {
                    const strToAdd = parentStrand.breakAfterNucleotide(nts[0]!);
                    if (strToAdd !== undefined) {
                        parentStrand.parentStructure!.addNaStrand(strToAdd);
                    }
                }
            } else {
                parentStrand?.parentStructure?.removeNaStrand(parentStrand);
            }
        } else if (pickingProxy.cgAminoAcid !== undefined) {
            const parentChain = pickingProxy.cgAminoAcid.parentChain;
            if (this._removalType === StructureElementType.RESIDUE) {
                const chainToAdd = parentChain.breakAtAminoAcid(pickingProxy.cgAminoAcid);
                if (chainToAdd !== undefined) {
                    parentChain.parentStructure!.addAaChain(chainToAdd);
                }
            } else {
                parentChain.parentStructure?.removeAaChain(parentChain);
            }
        }

        if (component instanceof CgStructureComponent) {
            (component as CgStructureComponent).updateRepresentations(CatanaState.WHAT);
        }

        if (stage.viewer.catanaRendering.unselect()) {
            stage.viewer.catanaRendering.render(stage.viewer);
        }

        this.done(stage);

        return true;
    }

    /**
     * Show/Highlight (visually) the element to be removed
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (CgRemoveState.canRemove(pickingProxy)) {
            if (this._removalType === StructureElementType.RESIDUE) {
                stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.NEGATIVE);
            } else {
                const repr = getRepresentationByOid(pickingProxy!.component, pickingProxy!.oid);
                const chainName = pickingProxy?.cgAminoAcid?.parentChain?.name ??
                    pickingProxy?.cgNucleotide?.parentStrand?.name ??
                    pickingProxy?.cgNucleotideBond?.bondStartPolymer.name ??
                    "";
                if (repr && repr instanceof CgStructureRepresentation) {
                    stage.viewer.selectFilteredCol(CatanaRendering.SELECTION_COLORS.NEGATIVE, { c: pickingProxy!.component, r: repr, f: ":" + chainName });
                }
                // Fallback option in case representation selection fails for some reason...
                else {
                    stage.viewer.smartSelect(pickingProxy?.component, undefined, undefined, CatanaRendering.SELECTION_COLORS.NEGATIVE);
                }
            }
            //stage.viewer.setCursor("pointer");
        } else {
            stage.viewer.unselect();
            //stage.viewer.setCursor(null);
        }
        return false;
    }

    /**
     * Does nothing
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

    public _enter(): void {
        this._prevCursorStyle = getCursorType();
        setCursorTypeCustom("remove");
    }

    public _exit(): void {
        setCursorType(this._prevCursorStyle);
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Remove"],
            ["Hold shift", "Continue removing"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgRemoveState;