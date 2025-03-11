import Annotation from "../../component/annotation";
import Component, { ComponentParameters } from "../../component/component";
import Stage from "../../stage/stage";
import { DummyHoneycombLattice } from "../nanomodeling/lattices/dummy-honeycomb-lattice";
import { DummySquareLattice } from "../nanomodeling/lattices/dummy-square-lattice";
import { SquareLattice } from "../nanomodeling/lattices/square-lattice";
import { Lattice, LatticeType } from "../nanomodeling/lattices/lattice";
import { Box3 } from "three";
import { ComponentRegistry } from "../../globals";

interface LatticeComponentParameters extends ComponentParameters {
    width: 8, // TODO Lattice.DEFAULT_HEIGHT,
    height: 8 // TODO Lattice.DEFAULT_HEIGHT
}

/**
 * Component representing DNA origami lattice object.
 */
export class LatticeComponent extends Component {

    private lattice: Lattice;
    private _annotation: Annotation;

    constructor(readonly stage: Stage, lattice: Lattice, params: Partial<LatticeComponentParameters> = {}) {
        super(stage,
            lattice,
            Object.assign({
                width: {
                    type: 'range', step: 1, max: 32, min: 1, buffer: true
                },
                height: {
                    type: 'range', step: 1, max: 32, min: 1, buffer: true
                }
            }, params));

        this.lattice = lattice;
        this.lattice.parentComponent = this;

        // Annotation is used only during the latice creation
        if (lattice instanceof DummySquareLattice || lattice instanceof DummyHoneycombLattice) {
            this._annotation = this.addAnnotation(lattice.getPosition(lattice.height, lattice.width), "", {
                applyFog: false
            });

            this.parameters.backendOnly = true;
        }

        this.updateName();
    }

    public get type(): string {
        return "lattice";
    }

    public getBoxUntransformed(...args: any[]): Box3 {
        const box = new Box3();

        box.expandByPoint(this.lattice.getPosition(0, 0, 0, false));
        box.expandByPoint(this.lattice.getPosition(0, this.lattice.width - 1, 0, false));
        box.expandByPoint(this.lattice.getPosition(this.lattice.height - 1, 0, 0, false));
        box.expandByPoint(this.lattice.getPosition(this.lattice.height - 1, this.lattice.width - 1, 0, false));

        return box;
    }

    public addRepresentation(type: any, params?: any): any {
        return this._addRepresentation(type, this.lattice, params);
    }

    public updateRepresentations(what: any) {
        super.updateRepresentations(what);
    }

    public get latticeType(): LatticeType {
        return this.lattice.latticeType;
    }

    public updateName() {
        let sizeString: string = "cols: " + this.lattice.width + ", rows:" + this.lattice.height + "";
        this.setName((this.lattice instanceof SquareLattice ? "Square Latt." : "Honeycomb Latt.") + " " +
            this.lattice.width + "x" + this.lattice.height);

        if (this.lattice instanceof DummySquareLattice || this.lattice instanceof DummyHoneycombLattice) {
            this._annotation.clearContent();
            this._annotation.setPosition(this.lattice.getPosition(this.lattice.height, this.lattice.width));
            this._annotation.setContent(sizeString);
        }
    }

    public supportsColorScheme(scheme: any): boolean {
        return false;
    }
}

ComponentRegistry.add("Lattice", LatticeComponent);

export default LatticeComponent;