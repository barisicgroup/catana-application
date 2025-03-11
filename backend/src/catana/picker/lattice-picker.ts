import {Vector3} from "three";
import { TypedArray } from "../../types";
import {Picker} from "../../utils/picker";
import { Lattice } from "../nanomodeling/lattices/lattice";

export class LatticeCellProxy {
    private _lattice: Lattice;
    private _index: number;
    constructor(lattice: Lattice, pid: number) {
        this._lattice = lattice;
        this._index = pid;
    }

    get lattice(): Lattice {
        return this._lattice
    }

    get index(): number {
        return this._index;
    }

    get coordinates(): {[p: string]: number} {
        return this._lattice.getCoordinatesFromIndex(this._index);
    }

    get position(): Vector3 {
        return this._lattice.getPositionFromIndex(this._index);
    }
}

export class LatticeCellPicker extends Picker {
    private lattice: Lattice;
    constructor(array: number[]|TypedArray, lattice: Lattice) {
        super(array);
        this.lattice = lattice;
    }

    get type(): string {
        return "latticeCell";
    }

    get data(): Lattice {
        return this.lattice;
    }

    getObject(pid: number): LatticeCellProxy {
        return new LatticeCellProxy(this.lattice, this.getIndex(pid));
    }

    _getPosition(pid: number): Vector3 {
        return this.getObject(this.getIndex(pid)).position;
    }
}