import { Matrix4 } from "three";
import { Lattice, LatticeType } from "./lattice";

export class HoneycombLattice extends Lattice {
    private _hoffset: number;
    private _voffset: number;

    public constructor(width: number = Lattice.DEFAULT_WIDTH, height: number = Lattice.DEFAULT_HEIGHT, cellDiameter: number = 20, matrix: Matrix4 = new Matrix4()) {
        super(width, height, cellDiameter, matrix);

        this._hoffset = this.cellDiameter / 2 * Math.sqrt(3);
        this._voffset = this.cellDiameter / 2;
    }

    public get latticeType(): LatticeType {
        return LatticeType.HONEYCOMB;
    }

    protected get hoffset(): number {
        return this._hoffset;
    }

    protected get voffset(): number {
        return this._voffset;
    }

    protected getX(rowIndex: number, colIndex: number): number {
        return colIndex * this.hoffset;
    }

    protected getY(rowIndex: number, colIndex: number): number {
        let add;
        if ((colIndex + 1) % 2 == 0) { // For even rows
            add = this.voffset;
        } else {
            add = -this.cellDiameter;
            ++rowIndex;
        }
        return add
            + (Math.ceil(rowIndex / 2) * this.cellDiameter)
            + (Math.floor(rowIndex / 2) * (this.voffset * 2 + this.cellDiameter));
    }

    public resizeFromLengths(widthLength: number, heightLength: number) {
        let h = Math.floor(heightLength / ((8 / 3) * this.voffset));
        let w = Math.floor(widthLength / this.hoffset);

        super.resize(Math.max(w, 1), Math.max(h, 1));
    }
}
