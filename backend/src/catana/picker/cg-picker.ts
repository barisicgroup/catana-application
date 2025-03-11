import { Vector3 } from "three";
import { TypedArray } from "../../types";
import { Picker } from "../../utils/picker";
import CgPolymer from "../data_model/cg-polymer";

/**
 * Picker classes are designed for picking functionality, i.e.,
 * selection of objects by clicking on them via canvas.
 */
export abstract class CgPicker extends Picker {
    protected _polymers: CgPolymer[];
    protected _polCounts: number[];

    /**
     * @param array Array with indices corresponding to individual picking IDs
     * @param polymers list of polymers referencing individual picked elements (in order)
     * @param polCounts portion of "array" covered by each polymer
     */
    constructor(array: number[] | TypedArray, polymers: CgPolymer[], polCounts: number[]) {
        super(array);
        this._polymers = polymers;
        this._polCounts = polCounts;

        console.assert(polymers.length === polCounts.length);
    }

    /** @override */
    public abstract get type(): string;

    /** @override */
    public get data(): CgPolymer[] {
        return this._polymers;
    }

    /** @override */
    public abstract getObject(pid: number): any;

    /** @override */
    public abstract _getPosition(pid: number): Vector3;

    /**
     * Returns parent polymer for given picking ID.
     * 
     * @param pid picking id
     * @returns coarse-grained polymer containing the object with this ID
     */
    protected getParent(pid: number): CgPolymer {
        let idx = 0;
        while (pid >= this._polCounts[idx]) {
            pid -= this._polCounts[idx];
            ++idx;
        }

        return this._polymers[idx];
    }
}