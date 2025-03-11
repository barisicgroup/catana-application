import { Matrix4, Vector3 } from "three";
import { MethodInfluencesAtomData } from "../decorators/atom-generation-decorators";
import GlobalIdGenerator from "../utils/global-id-generator";
import CgPolymer from "./cg-polymer";
import CgStructure from "./cg-structure";
import CgAminoAcidProxy from "./proxy/cg-amino-acid-proxy";
import CgAminoAcidStore from "./store/cg-amino-acid-store";
import { AminoAcidType } from "./types_declarations/monomer-types";

/**
 * Class storing data of single coarse-grained amino acid chain
 */
export class CgAminoAcidChain extends CgPolymer {
    constructor(globalId: number, name: string, parentStructure?: CgStructure, expectedLength?: number) {
        // Default size of the AA store is equal to the "official" max length of 
        // the oligopeptides 
        super(globalId, name, parentStructure, new CgAminoAcidStore(expectedLength ?? 20));
    }

    /**
     * @returns N-terminal amino acid residue
     */
    public get nTerm(): CgAminoAcidProxy | null {
        return this.getAminoAcidProxy(0);
    }

    /**
     * @returns C-terminal amino acid residue
     */
    public get cTerm(): CgAminoAcidProxy | null {
        return this.getAminoAcidProxy(this.length - 1);
    }

    /**
     * @returns Reference to an underlying amino acid store
     */
    public get aminoAcidStore(): CgAminoAcidStore {
        return this._monomerStore as CgAminoAcidStore;
    }

    /**
     * @override
     */
    public get sequence(): AminoAcidType[] {
        const seq = new Array<AminoAcidType>(this.length);
        let i = 0;

        this.forEachAminoAcid(cp => {
            seq[i++] = cp.aminoAcidType;
        });

        return seq;
    }

    /**
     * @override
     */
    public setSequence(seq: AminoAcidType[]): void {
        if (seq.length > 0) {
            this.forEachAminoAcid(ap => {
                ap.aminoAcidType = seq[ap.index % seq.length];
            });
        }
    }

    /**
     * @override
     */
    public applyMatrixTransformation(matrix: Matrix4): void {
        this.forEachAminoAcid(aa => aa.applyMatrixTransformation(matrix));
    }

    /**
     * Returns proxy to amino acid at given index
     * 
     * @param indexInStore index of the desired amino acid
     * @returns amino acid proxy pointing at given index
     */
    public getAminoAcidProxy(indexInStore: number): CgAminoAcidProxy | null {
        return (indexInStore >= 0 && indexInStore < this.length) ?
            new CgAminoAcidProxy(indexInStore, this) : null;
    }

    /**
     * @override
     */
    public getMonomerProxyTemplate(): CgAminoAcidProxy {
        return new CgAminoAcidProxy(-1, this);
    }

    /**
     * Inserts amino acid at given location in this chain.
     * If the insertion is performed in the middle of the chain, other
     * residues are correspondingly shifted.
     * 
     * @param index index where to insert the new residue
     * @param globalId global ID of the new residue
     * @param aaType amino acid type
     * @param caCenter alpha carbon location of the newly inserted residue
     * @param pdbId residue index in the corresponding atomistic structure
     * @returns amino acid proxy referencing newly inserted residue
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    public insertAminoAcid(index: number, globalId: number, aaType: AminoAcidType,
        caCenter: Vector3, pdbId?: number): CgAminoAcidProxy {
        this.aminoAcidStore.insertRecords(index, 1);

        const newAa = new CgAminoAcidProxy(index, this);
        newAa.globalId = globalId;
        newAa.pdbId = pdbId ?? -1;
        newAa.aminoAcidType = aaType;
        newAa.alphaCarbonLocation = caCenter;

        return newAa;
    }

    /**
     * Inserts amino acid at the start of the chain, i.e.,
     * creates new N-terminal amino acid residue.
     * 
     * @param globalId global ID of the new residue
     * @param aaType amino acid type
     * @param caCenter alpha carbon location of the newly inserted residue
     * @param pdbId residue index in the corresponding atomistic structure
     * @returns amino acid proxy referencing newly inserted residue
     */
    public insertNewNtermAminoAcid(globalId: number, aaType: AminoAcidType,
        caCenter: Vector3, pdbId?: number): CgAminoAcidProxy {
        return this.insertAminoAcid(0, globalId, aaType, caCenter, pdbId);
    }

    /**
     * Inserts amino acid at the end of the chain, i.e.,
     * creates new C-terminal amino acid residue.
     * 
     * @param globalId global ID of the new residue
     * @param aaType amino acid type
     * @param caCenter alpha carbon location of the newly inserted residue
     * @param pdbId residue index in the corresponding atomistic structure
     * @returns amino acid proxy referencing newly inserted residue
     */
    public insertNewCtermAminoAcid(globalId: number, aaType: AminoAcidType,
        caCenter: Vector3, pdbId?: number): CgAminoAcidProxy {
        return this.insertAminoAcid(this.length, globalId, aaType, caCenter, pdbId);
    }

    /**
     * Removes amino acid but still assumes that the chain remains connected
     * 
     * @param index index of the amino acid to be removed
     */
    public removeAminoAcidAtIndex(index: number): void {
        this.removeMonomerAtIndex(index);
    }

    /**
     * Removes amino acids but still assumes that the chain remains connected
     * 
     * @param indices array of indices of amino acids to be removed
     */
    public removeAminoAcidsAtIndices(indices: number[]) {
        this.removeMonomersAtIndices(indices);
    }

    /**
     * Removes amino acid but still assumes that the chain remains connected
     * 
     * @param proxy proxy referencing amino acid to remove
     */
    public removeAminoAcid(proxy: CgAminoAcidProxy) {
        this.removeMonomer(proxy);
    }

    /**
     * Removes amino acids but still assumes that the chain remains connected
     * 
     * @param proxies proxies referencing amino acids to remove
     */
    public removeAminoAcids(proxies: CgAminoAcidProxy[]) {
        this.removeMonomers(proxies);
    }

    /**
     * Breaks this chain at given amino acid by removing it,
     * shortening this chain and returning the second part ("after the removed amino acid")
     * as an output. If the amino acid is N/C terminus, no new chain is returned.
     * 
     * @param proxy proxy referencing amino acid to remove
     * @returns new chain consisting of amino acids following the removed one or undefined if there are none
     */
    public breakAtAminoAcid(proxy: CgAminoAcidProxy): CgAminoAcidChain | undefined {
        if (proxy.isNterm() || proxy.isCterm()) {
            this.removeAminoAcid(proxy);
            return undefined;
        }

        const breakIdx = proxy.index;
        this.removeAminoAcid(proxy);

        const newChain = new CgAminoAcidChain(GlobalIdGenerator.generateId(),
            this.parentStructure?.generateChainName() ?? "A", this.parentStructure, this.length - breakIdx);
        newChain.copyFrom(this, breakIdx, this.length);

        this.truncate(breakIdx);

        return newChain;
    }

    /**
     * Calls a provided callback on each amino acid (in N-term to C-term order)
     * 
     * @param callback function accepting amino acid proxy and its index as parameters
     */
    public forEachAminoAcid(callback: (a: CgAminoAcidProxy, i: number) => void): void {
        this.commonForEach(callback);
    }

    /**
     * Calls a provided callback on each amino acid (in reverse C-term to N-term order)
     * 
     * @param callback function accepting amino acid proxy and its index as parameters
     */
    public forEachAminoAcidReverse(callback: (a: CgAminoAcidProxy, i: number) => void): void {
        this.commonForEachReverse(callback);
    }

    /**
     * Returns the index of first amino acid meeting the given predicate
     * 
     * @param pred function accepting amino acid proxy and returning true if it meets the desired condition
     */
    public findAminoAcidIndex(pred: (a: CgAminoAcidProxy) => boolean): number {
        return this.commonFindIndex(pred);
    }

    /**
     * @override
     */
    public dispose() {
        super.dispose();
    }

    /**
     * @override
     */
    public proxyAtIndex(index: number): CgAminoAcidProxy | null {
        return this.getAminoAcidProxy(index);
    }

    /**
     * @override
     */
    public isProtein(): boolean {
        return true;
    }

    /**
     * @override
     */
    public isNucleic(): boolean {
        return false;
    }

    /**
     * @override
     */
    public isRna(): boolean {
        return false;
    }

    /**
     * @override
     */
    public isDna(): boolean {
        return false;
    }

    /**
     * @override
     */
    public isCyclic(): boolean {
        return false;
    }
}

export default CgAminoAcidChain;