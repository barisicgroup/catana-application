import { CatanaState } from "./catana-state";
import PickingProxy from "../../controls/picking-proxy";
import Component from "../../component/component";
import Stage from "../../stage/stage";
import { NucleicAcidStrandEnd } from "../data_model/types_declarations/polymer-types";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideBondProxy from "../data_model/proxy/cg-nucleotide-bond-proxy";
import { CgNucleotideBondComponent } from "../component/cg-nucleotide-bond-component";
import CgStructure from "../data_model/cg-structure";
import ConnectNaStrandsCommand from "../history/c-connect-na-strands";
import { appendCgStructuresShallow } from "../utils/catana-utils";
import { Matrix4 } from "three";
import CatanaRendering from "../webgl/catana-rendering";

class ConnectStateData {
    public directionality: NucleicAcidStrandEnd;
    public nucleotide: CgNucleotideProxy;
    public naStrand: CgNucleicAcidStrand;
    public pickingComponent: Component;
    public nucleotideBond: CgNucleotideBondProxy;
    public nucleotideBondComponent: CgNucleotideBondComponent;

    constructor(directionality: NucleicAcidStrandEnd, nucleotide: CgNucleotideProxy, naStrand: CgNucleicAcidStrand,
        pickingComponent: Component, nuclBond: CgNucleotideBondProxy, nuclBondComponent: CgNucleotideBondComponent) {
        this.directionality = directionality;
        this.nucleotide = nucleotide;
        this.naStrand = naStrand;
        this.pickingComponent = pickingComponent;
        this.nucleotideBond = nuclBond;
        this.nucleotideBondComponent = nuclBondComponent;
    }

    public get structure(): CgStructure {
        return this.naStrand.parentStructure!;
    }
}

/**
 * CatanaState to connect two nucleic acid strands
 */
export class CgNucleicAcidConnectState extends CatanaState {

    private _data: ConnectStateData | null = null;
    private _endData: { endNucleotide: CgNucleotideProxy } | null = null;

    /**
     * Does nothing
     * @returns False
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        return false;
    }

    /**
     * Show (visually) the hovered nucleotide
     * Unless a connection is already being made; in that case, do nothing
     * @returns True if a connection is already being made or if a valid nucleotide is being picked.
     *          False otherwise
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._data) return true;
        if (!pickingProxy || !pickingProxy.cgNucleotide) return false;
        const n = pickingProxy.cgNucleotide;
        if (n.isFivePrime() || n.isThreePrime()) {
            stage.viewer.smartSelect(undefined, undefined, pickingProxy);
            stage.viewer.setCursor("pointer");
            return true;
        } else {
            stage.viewer.unselect();
            stage.viewer.setCursor(null);
            return false;
        }
    }

    /**
     * Starts the creation of a connection
     * Unless an invalid nucleotide is being picked (or no nucleotide); in that case, do nothing
     * @returns False if nothing is being picked or the picked object is not a nucleotide
     *          True otherwise
     */
    public _down_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        if (pickingProxy === undefined || pickingProxy.cgNucleotide === undefined) return false;

        let np: CgNucleotideProxy = pickingProxy.cgNucleotide;
        if (!np.isFivePrime() && !np.isThreePrime()) {
            return true;
        }

        let directionality, naStrand, pickingComponent, nucleotideBond, nucleotideBondComponent;

        if (np.isThreePrime()) {
            directionality = NucleicAcidStrandEnd.THREE_PRIME;
        } else {
            directionality = NucleicAcidStrandEnd.FIVE_PRIME;
        }

        naStrand = np.parentStrand;
        pickingComponent = pickingProxy.component;

        // Visual representation of the DNA connection
        nucleotideBond = new CgNucleotideBondProxy(np.parentStrand, np.index, np.index);
        nucleotideBondComponent = new CgNucleotideBondComponent(stage, nucleotideBond);

        stage.addComponent(nucleotideBondComponent);
        stage.defaultFileRepresentation(nucleotideBondComponent);
        this._data = new ConnectStateData(directionality, np, naStrand, pickingComponent, nucleotideBond,
            nucleotideBondComponent);

        return true;
    }

    /**
     * Stops the creation of a connection
     * If both ends of a connection are valid, the connection is created
     * @returns False if nothing is being picked. True otherwise
     */
    public _up_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        let retValue = false;

        if (pickingProxy !== undefined && pickingProxy.cgNucleotide !== undefined &&
            this._data && this._endData) {
            stage.removeComponent(this._data.nucleotideBondComponent);

            const np = this._endData.endNucleotide;

            const npParentStrand = np.parentStrand;
            const npParentStructure = np.parentStructure!;
            const npComponent = npParentStructure.parentComponent!;

            if (this._data.structure !== npParentStructure) {
                const transfMatrix = new Matrix4().getInverse(this._data.pickingComponent.matrix).clone().multiply(npComponent.matrix);
                appendCgStructuresShallow(this._data.structure, npParentStructure, transfMatrix);
                stage.removeComponent(npComponent);
            }

            stage.catanaHistory.do(new ConnectNaStrandsCommand(
                this._data.naStrand,
                this._data.directionality,
                npParentStrand));

            this._data.pickingComponent.updateRepresentations(CatanaState.WHAT);
            this._data.pickingComponent.updateMatrix();

            retValue = true;
        }

        if (!retValue || !this.done(stage)) {
            this.clearData();
        }
        stage.viewer.unselect();

        return retValue;
    }

    /**
     * If a connection is taking place, update it
     * Otherwise, do nothing
     * @returns True if a connection is taking place. True otherwise
     */
    public _drag_left(stage: Stage, pickingProxy?: PickingProxy): boolean {
        if (!this._data) return false;
        this._endData = null;

        let endSet: boolean = false;
        let selectionSet: boolean = false;
        if (pickingProxy && pickingProxy.cgNucleotide) {
            const canConnect = this._data.naStrand.canConnectToNucleotide(
                pickingProxy.cgNucleotide,
                this._data.directionality);
            if (canConnect) {
                this._data.nucleotideBond.setBondEndElement(pickingProxy.cgNucleotide.parentStrand,
                    pickingProxy.cgNucleotide.index);
                stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.POSITIVE);
                endSet = true;
                selectionSet = true;
                this._endData = { endNucleotide: pickingProxy.cgNucleotide };
            } else {
                if (this._data.nucleotide === pickingProxy.cgNucleotide) {
                    this._data.nucleotideBond.resetBondEndData();
                    stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.NEGATIVE);
                    endSet = true;
                    selectionSet = true;
                }
            }
        }

        if (!endSet) this._data.nucleotideBond.setAlternativeEndPosition(stage.getWorldPosition());
        if (!selectionSet) stage.viewer.catanaRendering.unselect();

        this._data.nucleotideBondComponent.updateRepresentations(CatanaState.WHAT);

        return true;
    }

    /**
     * Cancels a connection if Escape is pressed. Does nothing otherwise
     * @returns True if Escape is pressed AND a connection is taking place. False otherwise
     */
    public _keyDown(stage: Stage, key: string): boolean {
        if (this._data && key === "Escape") {
            this.clearData();
            return true;
        }
        return false;
    }

    /**
     * Do nothing
     */
    public _enter(): void { }

    /**
     * Cleans up side effects
     */
    public _exit(): void {
        this.clearData();
    }

    private clearData() {
        if (this._data !== null) {
            this._data.nucleotideBondComponent.stage.removeComponent(this._data.nucleotideBondComponent);
        }
        this._data = null;
        this._endData = null;
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Drag", "Connect two nucleotides between 3' and 5'"],
            ["Hold shift", "Continue connecting"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgNucleicAcidConnectState;