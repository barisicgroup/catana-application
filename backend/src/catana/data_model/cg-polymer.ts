import { Color, Matrix4 } from "three";
import { Filter } from "../../catana";
import { MethodInfluencesAtomData } from "../decorators/atom-generation-decorators";
import GlobalIdGenerator from "../utils/global-id-generator";
import CgStructure from "./cg-structure";
import CgMonomerProxy from "./proxy/cg-monomer-proxy";
import CgMonomerStore from "./store/cg-monomer-store";
import { MonomerType } from "./types_declarations/monomer-types";
import CgPolymerView from "./views/cg-polymer-view";

/**
 * Class storing data of single coarse-grained polymer/chain
 */
export abstract class CgPolymer {
    private _globalId: number;
    private _name: string;
    private _customColor: Color | undefined = undefined;
    private _parentStructure: CgStructure | undefined = undefined;

    protected _monomerStore: CgMonomerStore;

    /**
     * @param globalId global ID of this polymer
     * @param name name of this polymer
     * @param parentStructure parent structure of this polymer
     * @param monStore instance of monomer store where the polymer data should be stored
     */
    constructor(globalId: number, name: string, parentStructure: CgStructure | undefined, monStore: CgMonomerStore) {
        this._globalId = globalId;
        this._name = name;
        this._parentStructure = parentStructure;
        this._monomerStore = monStore;
        this._customColor = new Color("orange");
    }

    /**
     * Copies data from the particular section of the other polymer to this one.
     * If this polymer carried some data, they will be replaced/removed.
     * 
     * @param other polymer to copy data from
     * @param startIdx index to start copy from (inclusive)
     * @param endIdxExcl index identifying the end of section to copy from (exclusive)
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    public copyFrom(other: CgPolymer, startIdx: number, endIdxExcl: number): void {
        const copyCount: number = endIdxExcl - startIdx;
        if (this._monomerStore.length < copyCount) {
            this._monomerStore.resize(copyCount);
        }
        this._monomerStore.copyFrom(other._monomerStore, 0, startIdx, copyCount);
        this._monomerStore.count = copyCount;
    }

    public forEachMonomer(callback: (mp: CgMonomerProxy, i: number) => void) {
        this.commonForEach(callback);
    }

    /**
     * Returns monomer store index corresponding to the monomer
     * with the given global ID.
     * 
     * @param globalId global ID to search for
     * @returns store index of monomer with given global ID or -1 if no such monomer exists. 
     */
    public getIndexForGlobalId(globalId: number): number {
        for (let i = 0; i < this.length; ++i) {
            if (this.monomerStore.globalId[i] === globalId) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Returns an array of polymer views determined by the provided filter
     * 
     * @param filter filter string determining which monomers to include
     * @returns array storing continuous views with monomers passing the filter test 
     */
    public getViews(filter: Filter): CgPolymerView[] {
        let result: CgPolymerView[] = [];

        if (filter.isAllFilter()) {
            result.push(new CgPolymerView(this));
        } else if (!filter.isNoneFilter()) {
            let from: number = -1;

            this.forEachMonomer((mp, i) => {
                // If this monomer should not be included
                if (filter.cgMonomerTest && !filter.cgMonomerTest(mp)) {
                    if (from >= 0) {
                        result.push(new CgPolymerView(this, from, i, false));
                        from = -1;
                    }
                    // If it should and it is the first one to be included after 
                    // some number of skipped, restart the from counter
                } else if (from < 0) {
                    from = i;
                }
            });

            if (from >= 0) {
                result.push(new CgPolymerView(this, from, this.length, from === 0 && this.isCyclic()));
            }
        }

        return result;
    }

    /**
     * @returns reference to the underlying monomer store
     */
    public get monomerStore(): CgMonomerStore {
        return this._monomerStore;
    }

    /**
     * @returns an array of monomer types describing the sequence of this polymer
     */
    public abstract get sequence(): MonomerType[];

    /**
     * Changes sequence of the whole polymer.
     * If the newly provided sequence is shorter, it will be applied in a "circular fashion".
     * 
     * @param seq new sequence to be applied to the current polymer
     */
    public abstract setSequence(seq: MonomerType[]): void;

    /**
     * @returns Global ID of this polymer
     */
    public get globalId(): number {
        return this._globalId;
    }

    /**
     * Sets new global ID for this polymer
     */
    public set globalId(val: number) {
        this._globalId = val;
    }

    /**
     * @returns Name of this polymer
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Sets new name for this polymer
     */
    public set name(val: string) {
        this._name = val;
    }

    /**
     * @returns Custom user-defined color of this polymer (or undefined if none set)
     */
    public get customColor(): Color | undefined {
        return this._customColor;
    }

    /**
     * Sets new custom color for this polymer
     */
    public set customColor(val: Color | undefined) {
        this._customColor = val;
    }

    /**
     * @returns reference to parent structure of this polymer (or undefined if none exists)
     */
    public get parentStructure(): CgStructure | undefined {
        return this._parentStructure;
    }

    /**
     * Sets new parent structure of this polymer
     */
    public set parentStructure(newPar: CgStructure | undefined) {
        this._parentStructure = newPar;
    }

    /**
     * @returns Length of this polymer (i.e., number of monomers)
     */
    public get length(): number {
        return this._monomerStore.count;
    }

    /**
     * Applies matrix transformation to all polymer's monomers
     * 
     * @param matrix transformation matrix
     */
    public abstract applyMatrixTransformation(matrix: Matrix4): void;

    /**
     * Changes global IDs of all included monomers (using the GlobalIdGenerator)
     * 
     * @param renameMap if provided, it will store the old id -> new id records for each monomer
     */
    public renumberMonomerGlobalIds(renameMap?: Map<number, number>): void {
        this.forEachMonomer(mp => {
            const newId = GlobalIdGenerator.generateId();
            if (renameMap) {
                renameMap.set(mp.globalId, newId);
            }
            mp.globalId = newId;
        })
    }

    /**
     * Disposes of this polymer
     */
    public dispose(): void {
        this._monomerStore.dispose();
    }

    /**
     * Executes a given callback on each monomer (going from start of the polymer to its end)
     * 
     * @param callback function to be executed on each monomer, accepting monomer proxy and its index in the polymer as parameters
     */
    protected commonForEach(callback: (a: CgMonomerProxy, i: number) => void): void {
        let p = this.getMonomerProxyTemplate();
        for (let i = 0; i < this.length; ++i) {
            p.index = i;
            callback(p, i);
        }
    }

    /**
     * Returns index of first monomer meeting the given predicate
     * 
     * @param pred boolean predicate function (accepting monomer proxy and its index as parameters)
     * @returns index of the first monomer for which the predicate returns "true"
     */
    protected commonFindIndex(pred: (a: CgMonomerProxy, i: number) => boolean): number {
        let p = this.getMonomerProxyTemplate();
        for (let i = 0; i < this.length; ++i) {
            p.index = i;
            if (pred(p, i)) {
                return i;
            }
        }
        return -1;
    }

    /**
    * Executes a given callback on each monomer (going from end of the polymer to its start, i.e., in reverse)
    * 
    * @param callback function to be executed on each monomer, accepting monomer proxy and its index in the polymer as parameters
    */
    protected commonForEachReverse(callback: (a: CgMonomerProxy, i: number) => void): void {
        let p = this.getMonomerProxyTemplate();
        for (let i = this.length - 1; i >= 0; --i) {
            p.index = i;
            callback(p, i);
        }
    }

    /**
     * Removes monomer at given index. If the polymer is empty after the removal,
     * it is also removed from the parent structure.
     * 
     * @param index index of the monomer to remove
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    protected removeMonomerAtIndex(index: number): void {
        this._monomerStore.removeRecord(index);

        if (this.length === 0) {
            this.parentStructure?.removePolymer(this);
        }
    }

    /**
     * Removes monomers stored at given indices. If the polymer is empty after the removal,
     * it is also removed from the parent structure.
     * 
     * @param indices an array of indices of monomers to remove
     */
    protected removeMonomersAtIndices(indices: number[]): void {
        indices.sort((a, b) => { return b - a; });

        for (let i = 0; i < indices.length; ++i) {
            this.removeMonomerAtIndex(indices[i]);
        }
    }

    /**
     * Removes given monomer. If the polymer is empty after the removal,
     * it is also removed from the parent structure.
     * 
     * @param proxy monomer to remove
     */
    protected removeMonomer(proxy: CgMonomerProxy): void {
        this.removeMonomerAtIndex(proxy.index);
    }

    /**
     * Removes given monomers. If the polymer is empty after the removal,
     * it is also removed from the parent structure.
     * 
     * @param proxies monomers to remove
     */
    protected removeMonomers(proxies: CgMonomerProxy[]): void {
        this.removeMonomersAtIndices(proxies.map(x => x.index));
    }

    /**
     * Shortens this polymer to a new length, discarding the original
     * data beyond this new size.
     * 
     * @param newLength new lenght of this polymer
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    protected truncate(newLength: number): void {
        // Other option would be to set the .count property
        // of the monomer store directly. This would result
        // in less memory allocations & copies. However, 
        // there would be bigger overhead in the total memory allocated.
        // Thus, this option is chosen right now.
        this._monomerStore.resize(newLength);
    }

    /**
     * Returns instance of monomer proxy at given index
     * 
     * @param index index of the desired monomer
     * @returns monomer proxy instance at the given index or null if index is not valid
     */
    public abstract proxyAtIndex(index: number): CgMonomerProxy | null;

    /**
     * @returns true if this polymer is a protein chain
     */
    public abstract isProtein(): boolean;

    /**
     * @returns true if this polymer is nucleic acid chain
     */
    public abstract isNucleic(): boolean;

    /**
     * @returns true if this polymer is RNA strand
     */
    public abstract isRna(): boolean;

    /**
     * @returns true if this polymer is DNA strand
     */
    public abstract isDna(): boolean;

    /**
     * @returns true if this polymer is cyclic/circular
     */
    public abstract isCyclic(): boolean;

    /**
    * Returns instance of a monomer proxy object with the index being set to -1.
    * It is expected that the index will be manually set by the user later on.
    * 
    * @returns monomer proxy instance pointing to invalid data
    */
    public abstract getMonomerProxyTemplate(): CgMonomerProxy;
}

export default CgPolymer;