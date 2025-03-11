import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import {getCursorType, getRepresentationByOid, setCursorType, setCursorTypeCustom} from "../utils/catana-utils";
import ProteinBaseState from "./protein-base-state";
import CatanaRendering from "../webgl/catana-rendering";
import {StructureElementType} from "../data_model/types_declarations/element-type";
import StructureRepresentation from "../../representation/structure-representation";

/**
 * CatanaState for the removal of proteins/protein elements (see StructureElementType)
 */
class ProteinRemoveState extends ProteinBaseState {
    private _removalType: StructureElementType;

    private removalFunction: (stage: Stage, pickingProxy: PickingProxy) => void;

    constructor(removalType: StructureElementType = StructureElementType.RESIDUE) {
        super();

        this.removalType = removalType;
    }

    public get removalType(): StructureElementType {
        return this._removalType;
    }

    public set removalType(type: StructureElementType) {
        this._removalType = type;

        if (type === StructureElementType.ATOM) {
            this.removalFunction = this.catanaProteinActions.removeAtom.bind(this.catanaProteinActions);
        } else if (type === StructureElementType.RESIDUE) {
            this.removalFunction = this.catanaProteinActions.removeResidue.bind(this.catanaProteinActions);
        } else if (type === StructureElementType.CHAIN) {
            this.removalFunction = this.catanaProteinActions.removeChain.bind(this.catanaProteinActions);
        } else {
            console.error("Invalid input value: " + type);
        }
    }

    /**
     * Removed the clicked element
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        this.removalFunction(stage, pickingProxy);
        this.done(stage);
        return true; // TODO Since there was an issue with removal when false was returned, I am returning true now just in case
    }

    /**
     * Shows/Highlights visually whether the hovered element is valid for removal
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (pickingProxy && pickingProxy.atom) {
            const c = pickingProxy.component;
            const r = getRepresentationByOid(pickingProxy!.component, pickingProxy!.oid);
            const f = ":" + pickingProxy.atom.chainname;

            if (c && r && r instanceof StructureRepresentation && this._removalType === StructureElementType.CHAIN) {
                stage.viewer.selectFilteredCol(CatanaRendering.SELECTION_COLORS.NEGATIVE, { c, r, f })
            } else {
                stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.NEGATIVE);
            }
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
        setCursorTypeCustom("remove");
    }

    public _exit(): void {
        setCursorType(this.prevCursorStyle);
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Remove"],
            ["Hold shift", "Continue removing"],
            ["", "All-atom structures only"]
        ];
    }
}

export default ProteinRemoveState;