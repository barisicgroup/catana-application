import CgPolymer from "../cg-polymer";
import CgMonomerProxy from "../proxy/cg-monomer-proxy";

/**
 * Simple class providing a view on a subset of CgPolymer data
 */
export class CgPolymerView {
    private _sourcePolymer: CgPolymer;
    private _from: number;
    private _to: number;
    private _isCyclic: boolean;

    /**
     * @param polymer source polymer
     * @param fromIncl starting index of the view subset, i.e., where the view should start (inclusive start)
     * @param toExcl index of the ending element which should not be included in the view (exclusive end)
     * @param isCyclic if the view should be cyclic or not
     */
    public constructor(polymer: CgPolymer, fromIncl?: number, toExcl?: number, isCyclic?: boolean) {
        this._sourcePolymer = polymer;
        this._from = fromIncl ?? 0;
        this._to = toExcl ?? polymer.length;
        this._isCyclic = isCyclic ?? polymer.isCyclic();
    }

    /**
     * @returns source polymer for this view
     */
    public get sourcePolymer(): CgPolymer {
        return this._sourcePolymer;
    }

    /**
     * @returns starting index in the source polymer
     */
    public get from(): number {
        return this._from;
    }

    /**
     * @returns ending index (excl.) in the source polymer
     */
    public get to(): number {
        return this._to;
    }

    /**
     * @returns length of the polymer view
     */
    public get length(): number {
        return Math.max(this.to - this.from, 0);
    }

    /**
     * Executes callback function on each monomer being part of this view.
     * 
     * @param callback Function were first argument correspond to the currently processed monomer proxy and 
     * the second argument contains monomer offset w.r.t this view.
     */
    public forEachMonomer(callback: (mp: CgMonomerProxy, o: number) => void): void {
        // Not very effective solution from the performance pov but it intentionally 
        // reuses the source polymer .forEach* function
        this.sourcePolymer.forEachMonomer((mp, i) => {
            if (i >= this.from && i < this.to) {
                callback(mp, i - this.from);
            }
        });
    }

    /**
     * @returns Instance of monomer proxy belonging to this polymer
     */
    public getMonomerProxyTemplate(): CgMonomerProxy {
        return this.sourcePolymer.getMonomerProxyTemplate();
    }

    /**
     * Returns monomer proxy index corresponding to its location in the source polymer.
     * For example, input offset 0 means that the returned index will equal to "from" value.
     * 
     * @param offset input offset in the view
     * @returns index in the source polymer corresponding to the input offset
     */
    public getProxyIndexForOffset(offset: number): number {
        return this.from + offset;
    }

    /**
     * @returns true if this view is cyclic
     */
    public isCyclic(): boolean {
        return this._isCyclic;
    }

    /**
     * @returns true if this view corresponds to protein polymer
     */
    public isProtein(): boolean {
        return this.sourcePolymer.isProtein();
    }

    /**
     * @returns true if this view corresponds to the nucleic polymer
     */
    public isNucleic(): boolean {
        return this.sourcePolymer.isNucleic();
    }

    /**
     * @returns true if this view corresponds to RNA
     */
    public isRna(): boolean {
        return this.sourcePolymer.isRna();
    }

    /**
     * @returns true if this view corresponds to DNA
     */
    public isDna(): boolean {
        return this.sourcePolymer.isDna();
    }
}

export default CgPolymerView;