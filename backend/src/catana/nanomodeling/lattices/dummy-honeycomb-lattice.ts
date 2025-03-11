import { Matrix4, Vector3 } from "three";
import { HoneycombLattice } from "./honeycomb-lattice";
import { LatticeType } from "./lattice";

/**
 * A honeycomb lattice that can be rendered but has no other functional purpose
 */
export class DummyHoneycombLattice extends HoneycombLattice {
    constructor(width: number, height: number, cellDiameter: number, startPos: Vector3) {
        super(width, height, cellDiameter, new Matrix4().makeTranslation(startPos.x, startPos.y, startPos.z));
    }

    public get latticeType(): LatticeType {
        return LatticeType.HONEYCOMB;
    }

    public get matrix() {
        return this._matrix;
    }

    resize(newWidth: number, newHeight: number) {
        //super.resize(newWidth, newHeight);
        this._width = newWidth;
        this._height = newHeight;
    }

    public toFunctionalLattice(): HoneycombLattice {
        return new HoneycombLattice(this.width, this.height, this.cellDiameter, this.matrix);
    }
}
