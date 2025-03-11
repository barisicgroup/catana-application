import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage"
import {getChainTerminusDirection, getChainTerminusResidue} from "../../structure/structure-utils";
import {getCursorType, getRepresentationByOid, setCursorType, setCursorTypeCustom} from "../utils/catana-utils";
import ProteinBaseState from "./protein-base-state";
import StructureComponent from "../../component/structure-component";
import CatanaStateData from "./catana-state-data";
import StructureRepresentation from "../../representation/structure-representation";
import AtomProxy from "../../proxy/atom-proxy";
import {CgStructureRepresentation} from "../representation/structure/cg-structure-representation";

class ProteinAddAminoAcidsStateData {
    stage: Stage;
    pickingProxy: PickingProxy;
    constructor(stage: Stage, pickingProxy: PickingProxy) {
        this.stage = stage;
        this.pickingProxy = pickingProxy;
    }
}

/**
 * CatanaState to add amino acids to structures
 */
export class ProteinAddAminoAcidsState extends ProteinBaseState {
    protected stateData: CatanaStateData;

    protected terminusVisChainId: number = -1;
    protected terminusVisChainEnd: string = "";
    protected terminusVisChainResCount: number = -1;
    protected terminusVisPrevPickProxState: boolean | undefined = undefined;

    private data: null | ProteinAddAminoAcidsStateData = null;

    constructor(data: CatanaStateData) {
        super();
        this.stateData = data;
        data.state = this;
    }

    private static isAtomValid(atomProxy: AtomProxy): boolean {
        return atomProxy.isProtein() || atomProxy.residue.isLigand();
    }

    private static isPickingValid(pickingProxy: PickingProxy): boolean {
        return pickingProxy && (
            (pickingProxy.atom && this.isAtomValid(pickingProxy.atom)) ||
            (pickingProxy.bond && (this.isAtomValid(pickingProxy.bond.atom1) || this.isAtomValid(pickingProxy.bond.atom2)))
        );
    }

    private static getChainName(pickingProxy: PickingProxy): string {
        return pickingProxy.atom ? pickingProxy.atom.chainname : pickingProxy.bond.atom1.chainname;
    }

    /**
     * Activates and shows the necessary 3D components to enable amino acid addition
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (!ProteinAddAminoAcidsState.isPickingValid(pickingProxy)) return false;
        this.showTerminusVis(stage, pickingProxy);
        this.data = new ProteinAddAminoAcidsStateData(stage, pickingProxy);
        return false;
    }

    /**
     * Shows/Highlights (visually) whether a hovered element is valid for amino acid addition
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (ProteinAddAminoAcidsState.isPickingValid(pickingProxy)) {
            const repr = getRepresentationByOid(pickingProxy.component, pickingProxy.oid);
            if (repr === null) {
                console.error("No representation found in Component (see below) with oid=" + pickingProxy.oid);
                console.error(pickingProxy.component);
                return false;
            } else if (!(repr instanceof StructureRepresentation || repr instanceof CgStructureRepresentation)) {
                console.error("Hovered representation (see below) must be a StructureRepresentation or CgStructureRepresentation (oid=" + pickingProxy.oid + ")");
                console.error(repr);
                return false;
            }

            const chainName: string = ProteinAddAminoAcidsState.getChainName(pickingProxy);
            const filterString: string = ":" + chainName;

            //stage.catanaSelection.selectFiltered(repr, filterString, true);
            //stage.viewer.catanaRendering.select(stage.catanaSelection, CatanaRenderingSelectionColor.POSITIVE);
            stage.viewer.selectFiltered({c: pickingProxy.component, r: repr, f: filterString});
            stage.viewer.setCursor("pointer");
        } else {
            stage.viewer.catanaRendering.unselect();
            stage.viewer.setCursor(null);
        }
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
        setCursorTypeCustom("plus");
    }

    public _exit(): void {
        setCursorType(this.prevCursorStyle);
        this.clearData();
        this.stateData.state = null;
    }

    private clearData(): void {
        // TODO It is rather ineffective to add & remove
        // the component repeatedly. It would be better to somehow hide it 
        // and then just show it and move to a new location.
        /*if (this.terminusShapeComp != null) {
            this.stage.removeComponent(this.terminusShapeComp!);
            this.terminusShapeComp = null;
        }*/
        if (this.data) {
            const stage = this.data.stage;
            stage.catanaVisManager.dirSel.hemisphere.setVisible(false);
            stage.viewer.requestRender();
        }
        this.data = null;
    }

    /**
     * Configures and shows the DirSel hemisphere for amino acid addition
     */
    private showTerminusVis(stage: Stage, pickingProxy: PickingProxy): void {
        const scnStateChanged = this.sceneStateChanged(pickingProxy);

        if ((scnStateChanged && pickingProxy && pickingProxy.residue) ||
            this.pickedObjectStateChanged(pickingProxy)) {

            //const newShape = new Shape("[tmp_chain_end_vis]");

            const lastResidueCenter = getChainTerminusResidue(pickingProxy.residue!.chain,
                this.stateData.chainEndToAppendAATo).getBackboneCentroid();

            const termDir = getChainTerminusDirection(pickingProxy.residue!.chain, this.stateData.chainEndToAppendAATo);
            //const coneEnd = lastResidueCenter.clone().add(termDir.clone().multiplyScalar(3));

            lastResidueCenter.applyMatrix4(pickingProxy.component.matrix);
            /*coneEnd.applyMatrix4(pickingProxy.component.matrix);

            newShape.addBuffer(BufferCreator.createConeBufferFromArrays(
                new Float32Array(lastResidueCenter.toArray()),
                new Float32Array(coneEnd.toArray()),
                new Float32Array([0.2, 1.0, 0.2]),
                undefined,
                new Float32Array([1.5]),
                undefined,
                undefined
            ));

            this.terminusShapeComp = new ShapeComponent(stage, newShape, { backendOnly: true });
            this.terminusShapeComp.addRepresentation("buffer", {
                opacity: 0.75
            });

            this.stage.addComponent(this.terminusShapeComp);*/

            const hemisphere = stage.catanaVisManager.dirSel.hemisphere;
            hemisphere.resetDirection();
            hemisphere.setRotation(termDir);
            hemisphere.setPosition(lastResidueCenter);
            hemisphere.setVisible(true);

            this.terminusVisChainId = pickingProxy.residue!.chainIndex;
            this.terminusVisChainEnd = this.stateData.chainEndToAppendAATo;
            this.terminusVisChainResCount = pickingProxy.residue!.chainStore.residueCount[pickingProxy.residue!.chainIndex];
        }
    }

    private sceneStateChanged(pickingProxy: PickingProxy) {
        return (pickingProxy !== undefined) !== this.terminusVisPrevPickProxState;
    }

    private pickedObjectStateChanged(pickingProxy: PickingProxy) {
        return pickingProxy && pickingProxy.residue && (
            pickingProxy.residue.chainIndex !== this.terminusVisChainId ||
            this.stateData.chainEndToAppendAATo !== this.terminusVisChainEnd ||
            this.terminusVisChainResCount !== pickingProxy.residue.chainStore.residueCount[pickingProxy.residue.chainIndex]);
    }

    public stateDataUpdated() {
        if (!this.data) return;
        this.showTerminusVis(this.data.stage, this.data.pickingProxy);
    }

    /**
     * Performs the addition of amino acids based on the provided data (see 'this.data')
     */
    public add() {
        if (!this.data) return;
        const direction = this.data.stage.catanaVisManager.dirSel.hemisphere.direction;
        const scope = this;
        for (const aaName of ProteinAddAminoAcidsState.parseAAString(this.stateData.aaName)) {
            this.catanaProteinActions.addAminoAcids(this.data.stage, this.data.pickingProxy, direction,
                aaName,
                this.stateData.chainEndToAppendAATo,
                this.stateData.count).then(() => {
                    if (!scope.data) return;
                    (scope.data.pickingProxy.component as StructureComponent).rebuildRepresentations();
                    scope.showTerminusVis(scope.data.stage, scope.data.pickingProxy);
                    scope.data.stage.viewer.requestRender();
                });
        }
    }

    private static parseAAString(aas: string): string[] {
        if (aas.indexOf(",") >= 0) {
            return aas.split(",").map(s => s.trim().toUpperCase());
        } else {
            return aas.toUpperCase().match(/.{3}/g) ?? [];
        }
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Click", "Select amino acid chain to add amino acids to"],
            ["", "All-atom proteins only"]
        ];
    }
}

export default ProteinAddAminoAcidsState;