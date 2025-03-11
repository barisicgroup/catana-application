import {CatanaState} from "./catana-state";
import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";
import {Vector3} from "three";
import {LatticeCellProxy} from "../picker/lattice-picker";
import CatanaRendering from "../webgl/catana-rendering";
import Component from "../../component/component";
import NucleicAcidStrandCreator from "../nanomodeling/nucleic-acid-strand-creator";
import {NaStrandCreatorComponent} from "../component/cg-na-strand-creator-component";
import GlobalIdGenerator from "../utils/global-id-generator";
import MultiObjectsStorage from "../utils/multi-objects-storage";
import CgStructure from "../data_model/cg-structure";

class NucleicAcidCreateStateData {
    strandCreator: NucleicAcidStrandCreator;
    strandCreatorComponent: NaStrandCreatorComponent;
    latticeCellProxy?: LatticeCellProxy;

    constructor(strandCreator: NucleicAcidStrandCreator, strandCreatorComponent: NaStrandCreatorComponent, latticeCellProxy?: LatticeCellProxy) {
        this.strandCreator = strandCreator;
        this.strandCreatorComponent = strandCreatorComponent;
        this.latticeCellProxy = latticeCellProxy;
    }
}

/**
 * CatanaState to create a new nucleic acid (single or double) strand
 */
export class CgNucleicAcidCreateState extends CatanaState {
    private readonly _maximumStrandLength = 2048;

    private _createDoubleStrand: boolean;
    private data: NucleicAcidCreateStateData | null = null;

    constructor(createDoubleStrand: boolean) {
        super();

        this._createDoubleStrand = createDoubleStrand;
    }

    /**
     * @returns 'ss' if this CatanaState creates a single nucleic acid strand
     *          'ds' if this CatanaState creates a double nucleic acid strand
     */
    public get type(): "ss" | "ds" {
        return this._createDoubleStrand ? "ds" : "ss";
    }

    /**
     * Do nothing
     */
    public _enter() { }

    /**
     * Cleans up side effects
     */
    public _exit() {
        this.clearData();
    }

    /**
     * Do nothing
     * @returns False
     */
    public _click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        return false;
    }

    /**
     * If a lattice cell is being picked, highlight it visually
     * Do nothing otherwise
     * @returns False
     */
    public _hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (pickingProxy && pickingProxy.latticeCell) {
            // Highlight lattice cell
            //stage.viewer.catanaRendering.select(pickingProxy, CatanaRenderingSelectionColor.NEUTRAL);
            //stage.viewer.requestRender();
            //stage.viewer.catanaRendering.render(stage.viewer);

            stage.viewer.smartSelect(undefined, undefined, pickingProxy, CatanaRendering.SELECTION_COLORS.POSITIVE);
            //return true;
        }
        return false;
    }

    /**
     * Starts the creation of a nucleic acid strand
     * @returns True
     */
    public _down_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        let latticeCellProxy: undefined | LatticeCellProxy = undefined;
        let startPos: Vector3;

        if (pickingProxy && pickingProxy.latticeCell) {
            latticeCellProxy = pickingProxy.latticeCell;
            startPos = pickingProxy.latticeCell.position;
        } else {
            startPos = stage.getWorldPosition();
        }

        const strandCreator = new NucleicAcidStrandCreator(startPos, startPos.clone(), CatanaState.dnaFactory.dnaForm, this._maximumStrandLength);
        const strandCreatorComp = new NaStrandCreatorComponent(stage, strandCreator);
        stage.defaultFileRepresentation(strandCreatorComp);

        const scope = this;
        stage.signals.componentRemoved.add((c: Component) => {
            if (c === strandCreatorComp) {
                scope.clearData();
            }
        });
        stage.addComponent(strandCreatorComp);

        this.data = new NucleicAcidCreateStateData(strandCreator, strandCreatorComp, latticeCellProxy);

        return true;
    }

    /**
     * Stops the creation of a nucleic acid strand
     * Or does nothing if no creation of a nucleic acid strand is taking place
     *
     * If the right conditions are met (see 'CatanaState.done()'), this state will clear any side effects and exit itself
     *
     * @returns True if a creation of a nucleic acid strand is currently taking place
     *          False otherwise
     */
    public _up_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (!this.data) return false;

        const newHelix = CatanaState.dnaFactory.buildHelixFromCreator(this.data.strandCreator);

        // TODO It might be needed to give user an option to append to an existing structure
        //      instead of creating a new one
        if (newHelix) {
            const newCgStructure = new CgStructure(GlobalIdGenerator.generateId(), "DNA_" + stage.compList.length);
            newHelix.name = newCgStructure.generateChainName();
            newCgStructure.addNaStrand(newHelix);

            if (this._createDoubleStrand) {
                newCgStructure.addNaStrand(CatanaState.dnaFactory.buildComplementaryHelix(newHelix));
            }

            const comps: Component[] = stage.addComponentFromObject(new MultiObjectsStorage([newCgStructure]));
            stage.defaultFileRepresentation(comps[0]);
        }

        stage.removeComponent(this.data.strandCreatorComponent);

        if (!this.done(stage)) this.clearData();

        return true;
    }

    /**
     * If the creation of a nucleic acid strand is taking place, update it based on the mouse position
     * Do nothing otherwise
     * @returns True if the creation of a nucleic acid strand is currently taking place
     *          False otherwise
     */
    public _drag_left(stage: Stage, pickingProxy: PickingProxy | undefined): boolean {
        if (this.data) {
            if (this.data.latticeCellProxy) {
                // Extension vector... will be build from current mouse position, cell position, and cell normal
                let ext: Vector3;

                let cellPos: Vector3 = this.data.latticeCellProxy.position;
                ext = stage.getWorldPosition().sub(cellPos);

                let cellNormal: Vector3 = this.data.latticeCellProxy.lattice.getNormal();
                ext.projectOnVector(cellNormal).add(cellPos);

                this.data.strandCreator.helicalAxisEnd = ext;
            } else {
                this.data.strandCreator.helicalAxisEnd = stage.getWorldPosition();
            }

            this.data.strandCreatorComponent.updateAnnotation(
                (this._createDoubleStrand ? "base pairs: " : "nucleotides: ") + this.data.strandCreator.numOfNucleotides);
            this.data.strandCreatorComponent.updateRepresentations(CatanaState.WHAT);
            return true;

        } else {
            return false;
        }
    }

    /**
     * Cancel the creation of a nucleic acid strand if 'Escape' is pressed
     * @returns True if a nucleic acid strand is currently being created AND 'Escape' is pressed
     *          False otherwise
     */
    public _keyDown(stage: Stage, key: string): boolean {
        if (this.data && key === "Escape") {
            this.clearData();
            return true;
        }
        return false;
    }

    private clearData(): void {
        if (this.data) {
            this.data.strandCreatorComponent.stage.removeComponent(this.data.strandCreatorComponent);
        }
        this.data = null;
    }

    protected _descriptions(): [string, string][] {
        return [
            ["Drag", "Create nucleic acid " + (this._createDoubleStrand ? "double" : "single") + " strand"],
            ["Hold shift", "Continue creating"],
            ["", "Coarse-grained only"]
        ];
    }
}

export default CgNucleicAcidCreateState;