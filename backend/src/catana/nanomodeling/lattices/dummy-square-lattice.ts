import { Matrix4, Vector3 } from "three";
import { LatticeType } from "./lattice";
import { SquareLattice } from "./square-lattice";

/**
 * A square lattice that can be rendered but has no other functional purpose
 */
export class DummySquareLattice extends SquareLattice {
    constructor(width: number, height: number, cellDiameter: number, startPos: Vector3) {
        super(width, height, cellDiameter, new Matrix4().makeTranslation(startPos.x, startPos.y, startPos.z));
    }

    public get latticeType(): LatticeType {
        return LatticeType.SQUARE;
    }

    public get matrix() {
        return this._matrix;
    }

    resize(newWidth: number, newHeight: number) {
        //super.resize(newWidth, newHeight);
        this._width = newWidth;
        this._height = newHeight;
    }

    public toFunctionalLattice(): SquareLattice {
        return new SquareLattice(this.width, this.height, this.cellDiameter, this.matrix);
    }
}
