import {CatanaState} from "./catana-state";
import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";
import {Matrix4, Vector3, Vector4} from "three";
import Component from "../../component/component";
import CatanaStateData from "./catana-state-data";
import {NucleicAcidStrandEnd} from "../data_model/types_declarations/polymer-types";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import {NaStrandCreatorComponent} from "../component/cg-na-strand-creator-component";
import NucleicAcidStrandCreator from "../nanomodeling/nucleic-acid-strand-creator";
import {getPointOnLine1ClosestToLine2, getStageCameraPointOnPlane} from "../utils/catana-utils";

class ExtendStateData {
    stage: Stage;
    directionality: NucleicAcidStrandEnd;
    selectedNucleotide: CgNucleotideProxy;
    naStrand: CgNucleicAcidStrand;
    pickingComponent: Component;
    strandCreator: NucleicAcidStrandCreator;
    strandCreatorComponent: NaStrandCreatorComponent;
    onDirectionChangedFun: () => void;
    threePrime?: CgNucleotideProxy;
    fivePrime?: CgNucleotideProxy;

    constructor(stage: Stage, directionality: NucleicAcidStrandEnd, selectedNucleotide: CgNucleotideProxy, naStrand: CgNucleicAcidStrand,
        pickingComponent: Component, strandCreator: NucleicAcidStrandCreator, strandCreatorComponent: NaStrandCreatorComponent,
        onDirectionChangedFun: () => void, threePrime?: CgNucleotideProxy, fivePrime?: CgNucleotideProxy) {
        this.stage = stage;
        this.directionality = directionality;
        this.selectedNucleotide = selectedNucleotide;
        this.naStrand = naStrand;
        this.pickingComponent = pickingComponent;
        this.strandCreator = strandCreator;
        this.strandCreatorComponent = strandCreatorComponent;
        this.onDirectionChangedFun = onDirectionChangedFun;
        this.threePrime = threePrime;
        this.fivePrime = fivePrime;
    }
}

/**
 * CatanaState to extend a nucleic acid strand
 */
export class CgNucleicAcidExtendState extends CatanaState {
    private readonly _maximumExtensionLength = 2048;

    private data: ExtendStateData | null = null;
    private readonly stateData: CatanaStateData;

    private dragging: boolean = false;

    constructor(stateData: CatanaStateData) {
        super();

        this.stateData = stateData;
        stateData.state = this;
    }

    /**
     * Do nothing
     * @returns False
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        /*if (!pickingProxy || !pickingProxy.cgNucleotide) return false;
        const nt = pickingProxy.cgNucleotide;
        if (nt.isThreePrime() || nt.isFivePrime()) {
            //const data = this.createData(stage, pickingProxy);
            //if (!data) return true;

            this.updateStrandCreator(false);
            this.updateHemisphere();
        }
        return true;*/
        return false;
    }

    /**
     * If an extension is currently taking place, finish it
     * Otherwise, do nothing
     */
    public extend() {
        if (!this.data) return;

        const numOfNewNucleotides: number = this.data.strandCreator.numOfNucleotides;
        if (numOfNewNucleotides > 0) {
            //const directionTransformed = this.data.stage.catanaVisManager.dirSel.hemisphere.direction;
            const directionTransformed = this.data.strandCreator.helicalAxisDirection;

            // Untransform direction with inverse of component matrix
            const matrixInverse = new Matrix4().getInverse(this.data.pickingComponent.matrix);
            const direction = CgNucleicAcidExtendState._transform(0, matrixInverse, directionTransformed);

            if (this.stateData.extendDoubleStrand) {
                CatanaState.dnaFactory.extendDoubleHelix(this.data.naStrand, this.data.directionality,
                    numOfNewNucleotides, direction);
            } else {
                CatanaState.dnaFactory.extendHelix(this.data.naStrand, this.data.directionality,
                    numOfNewNucleotides, direction);
            }


            this.data.pickingComponent.updateRepresentations(CatanaState.WHAT);
            this.data.pickingComponent.updateMatrix();
            if (this.data.pickingComponent instanceof NaStrandCreatorComponent) {
                this.data.pickingComponent.updateAnnotation();
            }

            this.updateHemisphere();
        }
    }

    /**
     * Shows (visually) whether the hovered nucleotide is valid for extension
     * (i.e., no extension is currently taking place AND a nucleotide is being picked)
     * @returns True if no extension is taking place and something is being picked
     *          False otherwise
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        let unselect = true;
        let block = false;
        if (!this.data && pickingProxy) {
            if (pickingProxy.cgNucleotide) {
                const nt = pickingProxy.cgNucleotide;
                if (nt.isThreePrime() || nt.isFivePrime()) {
                    stage.viewer.smartSelect(undefined, undefined, pickingProxy);
                    stage.viewer.setCursor("pointer");
                    unselect = false;
                }
            }
            block = true;
        }
        if (unselect) {
            stage.viewer.unselect();
            stage.viewer.setCursor(null);
        }
        return block;
    }

    /**
     * Starts a nucleic acid strand extension process if a nucleotide is being picked
     * Does nothing otherwise
     * @returns True if a nucleotide is being picked
     *          False otherwise
     */
    public _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        this.dragging = true;
        const data = this.createData(stage, pickingProxy);
        if (data !== null) {
            stage.addComponent(data.strandCreatorComponent);
            stage.defaultFileRepresentation(data.strandCreatorComponent);
            this.data = data;
            this.updateHemisphere();
            stage.catanaVisManager.dirSel.hemisphere.signals.directionChanged.add(data.onDirectionChangedFun);
            return true;
        }
        return false;
    }

    /**
     * If an extension is taking place, finish it
     * If the right conditions are met (see 'CatanaState.done()'), this state auto exits
     * @returns True is an extension is currently taking place. False otherwise
     */
    public _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (!this.data) return false;
        if (this.dragging) {
            this.dragging = false;
            this.extend();
            this.data.stage.removeComponent(this.data.strandCreatorComponent);
            if (!this.done(stage)) this.clearData();
        }
        return true;
    }

    /**
     * Updates the extension if one is currently taking place. Does nothing otherwise
     * @returns True if an extension is takinc place. False otherwise
     */
    public _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (this.dragging && this.data) {
            this.updateStrandCreator(true);
            return true;
        }
        return this.dragging;
    }

    /**
     * If 'Escape' is pressed, stop the extension and clear side effects
     * @returns True if an extension is currently taking place AND 'Escape' is pressed
     *          False otherwise
     */
    public _keyDown(stage: Stage, key: string): boolean {
        if (this.dragging && key === "Escape") {
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
     * Clear the 'stateData' and other side effects
     */
    public _exit(): void {
        this.stateData.state = null;
        this.clearData();
    }

    private clearData() {
        if (this.data) {
            this.data.strandCreatorComponent.stage.removeComponent(this.data.strandCreatorComponent);
            this.data.stage.catanaVisManager.dirSel.hemisphere.signals.directionChanged.remove(this.data.onDirectionChangedFun);
            this.data.stage.catanaVisManager.dirSel.hemisphere.setVisible(false);
        }
        this.data = null;
    }

    private static calculateDnaExtensionVector(stage: Stage, start: Vector3, direction: Vector3, directionality: NucleicAcidStrandEnd): Vector3 {
        if (stage.mouseObserver.ctrlKey || stage.mouseObserver.metaKey) {
            const end = getStageCameraPointOnPlane(stage, start);
            return end.sub(start);
        } else {
            // line1
            const P11 = start.clone();
            const P12 = start.clone().add(direction);

            // line2
            const P21 = stage.viewer.cameraTransformed.position.clone();
            const P22 = stage.getWorldPosition();

            // Point on line1 that is closest to line2
            const P3 = getPointOnLine1ClosestToLine2(P11, P12, P21, P22);

            return P3.sub(P11);
        }
    }

    /**
     * Do nothing if no extension is taking place
     * Otherwise, update the extension based on the data in 'stateData'
     */
    public stateDataUpdated() {
        if (!this.data) return;

        const directionality = this.getDirectionalityFromStateData();
        if (directionality !== this.data.directionality) {
            this.data.directionality = directionality;
            if (directionality === NucleicAcidStrandEnd.THREE_PRIME) {
                delete this.data.fivePrime;
                this.data.threePrime = this.data.naStrand.threePrime || undefined;
            } else {
                delete this.data.fivePrime;
                this.data.fivePrime = this.data.naStrand.fivePrime || undefined;
            }
            this.updateHemisphere();
        }

        this.updateStrandCreator(false);
    }

    private getDirectionalityFromStateData() {
        return this.stateData.strandEndToAppendNTTo === "5'"
            ? NucleicAcidStrandEnd.FIVE_PRIME
            : NucleicAcidStrandEnd.THREE_PRIME;
    }

    private static _transform(w: number, matrix: Matrix4, v3?: Vector3): Vector3 | undefined {
        if (!v3) return undefined;
        const v4 = new Vector4(v3.x, v3.y, v3.z, w).applyMatrix4(matrix);
        return new Vector3(v4.x, v4.y, v4.z);
    }

    /**
     * Changes the DirSel hemisphere position and rotation to match the location and orientation of the extension
     */
    private updateHemisphere() {
        if (!this.data) return;

        const stage = this.data.stage;
        const matrix = this.data.pickingComponent.matrix;
        const pos = CgNucleicAcidExtendState._transform(1, matrix, this.data.naStrand.getExtensionStart(this.data.directionality));
        const dir = CgNucleicAcidExtendState._transform(0, matrix, this.data.naStrand.getExtensionDirection(this.data.directionality));

        const hemisphere = stage.catanaVisManager.dirSel.hemisphere;
        hemisphere.resetDirection();
        hemisphere.setPosition(pos!); // TODO 'pos' may be undefined... fix?
        hemisphere.setRotation(dir!); // TODO 'dir' may be undefined... fix?
        hemisphere.setVisible(true);
    }

    /**
     * Updates the strand creator (visual representation of the extension)
     * @param useMousePosition Whether to use the position of the mouse in the update
     *                         The alternative is the direction of the DirSel hemisphe
     */
    private updateStrandCreator(useMousePosition: boolean) {
        if (!this.data) return;

        let ext: Vector3;
        const start = CgNucleicAcidExtendState._transform(1, this.data.pickingComponent.matrix, this.data.naStrand.getExtensionStart(this.data.directionality)!)!;
        //const start = this.data.naStrand.getExtensionStart(this.data.directionality)!;
        //const start = this.data.strandCreator.helicalAxisStart;
        const dir = this.data.stage.catanaVisManager.dirSel.hemisphere.direction;
        if (useMousePosition) { // TODO uncomment
            ext = CgNucleicAcidExtendState.calculateDnaExtensionVector(this.data.stage, start, dir, this.data.directionality);
        } else {
            const count = this.stateData.count;
            const length = CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseRise * count;
            ext = dir.multiplyScalar(length);
        }

        //this.data.strandCreator.helicalAxisStart = start.clone();
        this.data.strandCreator.helicalAxisEnd = start.clone().add(ext);
        this.data.strandCreatorComponent.updateRepresentations(CatanaState.WHAT);
        this.data.strandCreatorComponent.updateAnnotation();
    }

    /**
     * Creates the necessary data for extension if the provided 'pickingProxy' is picking a 'cgNucleotide'
     * Does nothing otherwise
     * @returns null if 'pickingProxy' is undefined or is not picking a 'cgNucleotide'
     *          The newly created ExtendStateData otherwise
     */
    private createData(stage: Stage, pickingProxy?: PickingProxy): null | ExtendStateData {
        if (!pickingProxy || !pickingProxy.cgNucleotide) return null;

        let threePrime, fivePrime;
        let directionality: NucleicAcidStrandEnd;

        let nt = pickingProxy.cgNucleotide;

        if (nt.isThreePrime()) {
            threePrime = nt;
            directionality = NucleicAcidStrandEnd.THREE_PRIME;
        }
        else if (nt.isFivePrime()) {
            fivePrime = nt;
            directionality = NucleicAcidStrandEnd.FIVE_PRIME;
        }
        else {
            directionality = this.getDirectionalityFromStateData();
            if (directionality === NucleicAcidStrandEnd.THREE_PRIME) {
                threePrime = nt.parentStrand.threePrime;
            } else {
                fivePrime = nt.parentStrand.fivePrime;
            }
        }

        let naStrand = nt.parentStrand;
        let pickingComponent = pickingProxy.component;

        // Visual representation of the DNA extension
        let pos: Vector3 = CgNucleicAcidExtendState._transform(1, pickingComponent.matrix, naStrand.getExtensionStart(directionality)!)!;
        let strandCreator = new NucleicAcidStrandCreator(pos, pos.clone(), CatanaState.dnaFactory.dnaForm, this._maximumExtensionLength);
        let strandCreatorComponent = new NaStrandCreatorComponent(stage, strandCreator);
        //stage.addComponent(strandCreatorComponent);
        //stage.defaultFileRepresentation(strandCreatorComponent);

        stage.viewer.catanaRendering.unselect();

        const onDirectionChangedFun = () => {
            this.updateStrandCreator(false);
        }

        return new ExtendStateData(stage, directionality, nt, naStrand, pickingComponent,
            strandCreator, strandCreatorComponent, onDirectionChangedFun, threePrime || undefined, fivePrime || undefined);
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Drag", "Extend a nucleic acid strand from 3' or 5'"],
            ["Hold ctrl", "Arbitrary direction"],
            ["Hold shift", "Continue extending"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgNucleicAcidExtendState;