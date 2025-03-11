import { Matrix4, Vector3 } from "three";
import { CatanaState } from "../../actions/catana-state";
import LatticeComponent from "../../component/lattice-component";

export enum LatticeType {
    SQUARE,
    HONEYCOMB
}

/**
 * Describes a generic lattice where each cell can be accessed with unique X and Y coordinates
 */
export abstract class Lattice {
    protected static readonly LATTICE_ROW: Vector3 = new Vector3(0, 1, 0);
    protected static readonly LATTICE_COLUMN: Vector3 = new Vector3(1, 0, 0);
    protected static readonly LATTICE_NORMAL: Vector3 = new Vector3(0, 0, 1);

    protected static readonly DEFAULT_WIDTH: number = 8;
    protected static readonly DEFAULT_HEIGHT: number = 8;

    protected static readonly DEFAULT_WIDTH_MAX: number = 128;
    protected static readonly DEFAULT_HEIGHT_MAX: number = 128;

    protected _cellDiameter: number;

    protected _width: number = Lattice.DEFAULT_WIDTH;
    protected _height: number = Lattice.DEFAULT_HEIGHT;

    protected _start: Vector3;
    protected _end: Vector3;

    protected _matrix: Matrix4;

    protected _parentComponent: LatticeComponent | undefined;

    public constructor(width: number = Lattice.DEFAULT_WIDTH, height: number = Lattice.DEFAULT_HEIGHT, cellDiameter: number = 20, matrix: Matrix4 = new Matrix4()) {
        this._matrix = matrix;
        this._cellDiameter = cellDiameter;
        this.resize(width, height);
    }

    // Abstract methods
    protected abstract getX(rowIndex: number, colIndex: number): number;
    protected abstract getY(rowIndex: number, colIndex: number): number;
    public abstract resizeFromLengths(widthLength: number, heightLength: number): void;
    public abstract get latticeType(): LatticeType;
    
    protected getZ(depth: number): number {
        return CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseRise * depth;
    }

    public get type(): string {
        return "Lattice";
    }

    public get parentComponent(): LatticeComponent | undefined {
        return this._parentComponent;
    }

    public set parentComponent(comp: LatticeComponent | undefined) {
        this._parentComponent = comp;
    }

    /**
     * Given the coordinates of a lattice cell (rowIndex and colIndex), return the 3D position of that cell
     * @param rowIndex The row index of the lattice cell
     * @param colIndex The row index of the lattice cell
     * @param depth
     * @param applyCompTransf
     */
    public getPosition(rowIndex: number, colIndex: number, depth: number = 0, applyCompTransf: boolean = true): Vector3 {
        const pos = new Vector3(
            this.getX(rowIndex, colIndex),
            this.getY(rowIndex, colIndex),
            this.getZ(depth)).applyMatrix4(this._matrix);

        if (this._parentComponent && applyCompTransf) {
            pos.applyMatrix4(this._parentComponent.matrix);
        }

        return pos;
    }

    /**
     * Get a lattice cell's unique index from its row and column indeexes
     */
    public getIndex(rowIndex: number, colIndex: number): number {
        return rowIndex * this._width + colIndex;
    }

    /**
     * Get a lattice cell's row and columns indexes based on its unique index
     */
    public getCoordinatesFromIndex(index: number): { [p: string]: number; } {
        let colIndex = index % this._width;
        let rowIndex = Math.round((index - colIndex) / this._width);
        return {
            rowi: rowIndex,
            coli: colIndex
        };
    }

    /**
     * Get a lattice cell's 3D position based on its unique index
     */
    public getPositionFromIndex(index: number): Vector3 {
        let coords = this.getCoordinatesFromIndex(index);
        return this.getPosition(coords.rowi, coords.coli);
    }

    /**
     * Returns a unit vector pointing in the direction of the lattice normal
     */
    public getNormal(applyCompTransf: boolean = true): Vector3 {
        return this.getAxis("normal");
    }

    /**
     * Returns a unit vector pointing in the direction along which the column index increases (+x)
     *     _____
     *    |     |  ->
     *    |_____|
     */
    public getColumnAxis(applyCompTransf: boolean = true): Vector3 {
        return this.getAxis("column");
    }

    /**
     * Returns a unit vector pointing in the direction along which the row index increases (+y)
     *     _____
     *    |     |  ^
     *    |_____|  |
     */
    public getRowAxis(applyCompTransf: boolean = true): Vector3 {
        return this.getAxis("row");
    }
    private getAxis(axis: "y" | "row" | "x" | "column" | "z" | "normal", applyCompTransf: boolean = true): Vector3 {
        let vec;
        switch (axis) {
            case "y": case "column": vec = Lattice.LATTICE_COLUMN; break;
            case "x": case "row": vec = Lattice.LATTICE_ROW; break;
            case "z": case "normal": vec = Lattice.LATTICE_NORMAL; break;
            default:
                console.error("Unexpected axis type '" + axis + "'. Returning (0,0,0)...");
                return new Vector3(0, 0, 0);
        }
        vec = vec.clone();
        vec.applyMatrix4(new Matrix4().extractRotation(this._matrix));
        if (this._parentComponent && applyCompTransf) vec.applyQuaternion(this._parentComponent.quaternion);
        return vec.normalize();
    }

    /**
     * Changes the size of the lattice
     * @param newWidth Number of lattice columns
     * @param newHeight Number of lattice rows
     */
    public resize(newWidth: number, newHeight: number) {
        if (newHeight < this._cells.length) {
            this._cells.length = newHeight;
            if (newWidth === this._width)
                return;
        }

        while (this._cells.length < newHeight) {
            this._cells.push([]);
        }

        for (let rowi = 0; rowi < this._cells.length; ++rowi) {
            let row = this._cells[rowi];
            while (row.length < newWidth) {
                row.push(null);
            }
            row.length = newWidth;
        }

        this._width = Math.min(newWidth, Lattice.DEFAULT_WIDTH_MAX);
        this._height = Math.min(newHeight, Lattice.DEFAULT_HEIGHT_MAX);
    }

    /**
     * Moves origin ([0, 0] lattice index) to the new location
     */
    public moveOriginToNewLocation(newOrigin: Vector3): void {
        const oldOrigin = this.getPosition(0, 0, 0, false);
        const translVec = newOrigin.clone().sub(oldOrigin);
        this._matrix.multiply(new Matrix4().makeTranslation(-translVec.x, -translVec.y, -translVec.z));
    }

    /**
     * [rows][columns] or:
     *
     *         col0   col1
     * row0: [ value, value, ... ]
     * row1: [ value, value, ... ]
     * ...
     *
     */
    private _cells: null[][] = []; // TODO Currently unused

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public get cellDiameter(): number {
        return this._cellDiameter;
    }
}

export default Lattice;