import { Lattice, LatticeType } from "./lattice";

export class SquareLattice extends Lattice {
    public get latticeType(): LatticeType {
        return LatticeType.SQUARE;
    }
    
    protected getX(rowIndex: number, colIndex: number): number {
        return colIndex * this.cellDiameter;
    }

    protected getY(rowIndex: number, colIndex: number): number {
        return rowIndex * this.cellDiameter;
    }

    public resizeFromLengths(widthLength: number, heightLength: number) {
        let w: number = Math.ceil(widthLength / this.cellDiameter);
        let h: number = Math.ceil(heightLength / this.cellDiameter);

        super.resize(Math.max(w, 1), Math.max(h, 1));
    }
}
