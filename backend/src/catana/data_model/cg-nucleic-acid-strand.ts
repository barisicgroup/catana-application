import { Matrix4, Vector3 } from "three";
import CgPolymer from "./cg-polymer";
import CgStructure from "./cg-structure";
import CgNucleotideProxy from "./proxy/cg-nucleotide-proxy";
import CgNucleotideStore from "./store/cg-nucleotide-store";
import { getComplementaryBase, NucleobaseType } from "./types_declarations/monomer-types";
import GlobalIdGenerator from "../utils/global-id-generator";
import { NucleicAcidStrandEnd, NucleicAcidType } from "./types_declarations/polymer-types";
import { MethodInfluencesAtomData } from "../decorators/atom-generation-decorators";
import { computeHelicalAxis } from "../nanomodeling/nucleic-acid-utils";

/**
 * Class storing data of single coarse-grained nucleic acid strand
 */
export class CgNucleicAcidStrand extends CgPolymer {
    private _isCircular: boolean = false;
    private _isScaffold: boolean = false;
    private _naType: NucleicAcidType;

    constructor(globalId: number, name: string, naType: NucleicAcidType, parentStructure?: CgStructure, expectedLength?: number) {
        // Since staple strands in DNA origami usually have about 32 nucleotides,
        // the default size for nucleotide store is set to 33. 
        super(globalId, name, parentStructure, new CgNucleotideStore(expectedLength ?? 33));

        this._naType = naType;
    }

    /**
     * @returns true if this strand is circular
     */
    public get isCircular(): boolean {
        return this._isCircular;
    }

    /**
     * Sets the circularity of this strand
     */
    public set isCircular(newVal: boolean) {
        this._isCircular = newVal;
    }

    /**
     * @returns the type of this nucleic acid 
     */
    public get naType(): NucleicAcidType {
        return this._naType;
    }

    /**
     * Sets the type of this nucleic acid strand
     */
    public set naType(type: NucleicAcidType) {
        this._naType = type;
    }

    /**
     * @returns true if this strand is a scaffold strand
     */
    public get isScaffold(): boolean {
        return this._isScaffold;
    }

    /**
     * Set whether this strand is a scaffold (true) or a staple (false)
     */
    public set isScaffold(isScaff: boolean) {
        this._isScaffold = isScaff;
    }

    /**
     * @returns proxy referencing the 5' end nucleotide
     */
    public get fivePrime(): CgNucleotideProxy | null {
        return this.getNucleotideProxy(0);
    }

    /**
     * @returns proxy referencing the 3' end nucleotide
     */
    public get threePrime(): CgNucleotideProxy | null {
        return this.getNucleotideProxy(this.length - 1);
    }

    /**
     * @returns reference to underlying nucleotide store
     */
    public get nucleotideStore(): CgNucleotideStore {
        return this._monomerStore as CgNucleotideStore;
    }

    /**
     * @override
     */
    public get sequence(): NucleobaseType[] {
        const seq = new Array<NucleobaseType>(this.length);
        let i = 0;

        this.forEachNucleotide(cp => {
            seq[i++] = cp.nucleobaseType;
        });

        return seq;
    }

    /**
     * @override
     */
    public setSequence(seq: NucleobaseType[]): void {
        if (seq.length > 0) {
            this.forEachNucleotide(nt => {
                const nbType = seq[nt.index % seq.length];
                nt.nucleobaseType = nbType;
                const pair = nt.pairedNucleotide;
                if (pair) {
                    pair.nucleobaseType = getComplementaryBase(nbType, this.naType);
                }
            });
        }
    }

    /**
     * @override
     */
    public applyMatrixTransformation(matrix: Matrix4): void {
        this.forEachNucleotide(nt => nt.applyMatrixTransformation(matrix));
    }

    /**
     * Retrieves proxy referencing nucleotide at the given index
     * 
     * @param indexInStore index of the nucleotide to refer to
     * @returns proxy pointing at nucleotide at given index
     */
    public getNucleotideProxy(indexInStore: number): CgNucleotideProxy | null {
        return (indexInStore >= 0 && indexInStore < this.length) ?
            new CgNucleotideProxy(indexInStore, this) : null;
    }

    /**
     * @override
     */
    public getMonomerProxyTemplate(): CgNucleotideProxy {
        return new CgNucleotideProxy(-1, this);
    }

    /**
     * Updates information about paired nucleotides,
     * used in cases there was global ID-changing operation executed.
     * 
     * @param fromToMap map storing [old global id, new global id] pairs for each nucleotide
     */
    public updatePairIds(fromToMap: Map<number, number>) {
        for (let i = 0; i < this.length; ++i) {
            const newId = fromToMap.get(this.nucleotideStore.pairId[i]);
            if (newId !== undefined) {
                this.nucleotideStore.pairId[i] = newId;
            }
        }
    }

    /**
     * Inserts new nucleotide into this strand. If the insertion 
     * happens in the middle of the strand, other nucleotides are shifted
     * in the underlying data structure.
     * 
     * @param index index where the nucleotide should be inserted (0 refers to 5' location)
     * @param globalId global ID of the newly inserted nucleotide
     * @param nbType base type of the newly inserted nucleotide
     * @param nbCenter nucleobase center of the newly inserted nucleotide
     * @param bbCenter backbone center of the newly inserted nucleotide
     * @param baseNormal base normal of the newly inserted nucleotide
     * @param hydrogenFaceDir hydrogen face direction of the newly inserted nucleotide
     * @param complementary proxy referencing the paired nucleotide (if any)
     * @param pdbId residue index referencing corresponding all-atom structure residue (if any)
     * @returns proxy referencing the newly inserted nucleotide
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    public insertNucleotide(index: number, globalId: number, nbType: NucleobaseType,
        nbCenter: Vector3, bbCenter: Vector3,
        baseNormal: Vector3, hydrogenFaceDir: Vector3,
        complementary?: CgNucleotideProxy, pdbId?: number): CgNucleotideProxy {
        this.nucleotideStore.insertRecords(index, 1);

        const newNt = new CgNucleotideProxy(index, this);
        newNt.globalId = globalId;
        newNt.pdbId = pdbId ?? -1;
        newNt.nucleobaseType = nbType;
        newNt.nucleobaseCenter = nbCenter;
        newNt.backboneCenter = bbCenter;
        newNt.baseNormal = baseNormal;
        newNt.hydrogenFaceDir = hydrogenFaceDir;
        newNt.pairId = complementary?.globalId ?? -1;

        return newNt;
    }

    /**
     * Inserts new nucleotide at the 5' end of this strand.
     * 
     * @param globalId global ID of the newly inserted nucleotide
     * @param nbType base type of the newly inserted nucleotide
     * @param nbCenter nucleobase center of the newly inserted nucleotide
     * @param bbCenter backbone center of the newly inserted nucleotide
     * @param baseNormal base normal of the newly inserted nucleotide
     * @param hydrogenFaceDir hydrogen face direction of the newly inserted nucleotide
     * @param complementary proxy referencing the paired nucleotide (if any)
     * @param pdbId residue index referencing corresponding all-atom structure residue (if any)
     * @returns proxy referencing the newly inserted nucleotide
     */
    public insertNewFivePrimeNucleotide(globalId: number, nbType: NucleobaseType,
        nbCenter: Vector3, bbCenter: Vector3,
        baseNormal: Vector3, hydrogenFaceDir: Vector3,
        complementary?: CgNucleotideProxy, pdbId?: number): CgNucleotideProxy {
        return this.insertNucleotide(0, globalId, nbType, nbCenter, bbCenter,
            baseNormal, hydrogenFaceDir, complementary, pdbId);
    }

    /**
     * Inserts new nucleotide at the 3' end of this strand.
     * 
     * @param globalId global ID of the newly inserted nucleotide
     * @param nbType base type of the newly inserted nucleotide
     * @param nbCenter nucleobase center of the newly inserted nucleotide
     * @param bbCenter backbone center of the newly inserted nucleotide
     * @param baseNormal base normal of the newly inserted nucleotide
     * @param hydrogenFaceDir hydrogen face direction of the newly inserted nucleotide
     * @param complementary proxy referencing the paired nucleotide (if any)
     * @param pdbId residue index referencing corresponding all-atom structure residue (if any)
     * @returns proxy referencing the newly inserted nucleotide
     */
    public insertNewThreePrimeNucleotide(globalId: number, nbType: NucleobaseType,
        nbCenter: Vector3, bbCenter: Vector3,
        baseNormal: Vector3, hydrogenFaceDir: Vector3,
        complementary?: CgNucleotideProxy, pdbId?: number): CgNucleotideProxy {
        return this.insertNucleotide(this.length, globalId, nbType, nbCenter, bbCenter,
            baseNormal, hydrogenFaceDir, complementary, pdbId);
    }

    /**
     * Inserts nucleotides from the given part of other strand 
     * to the desired position in this strand.
     * The existing nucleotides are shifted so the operation preserves the existing data,
     * as well as the newly added ones.
     * 
     * @param other other nucleic acid strand to insert data from
     * @param thisOffset where to insert data into this strand
     * @param otherOffset where the data reading in other strand should start
     * @param length length (in nr. of nucleotides) of the inserted part
     */
    @MethodInfluencesAtomData(x => x.parentStructure)
    public insertFrom(other: CgNucleicAcidStrand, thisOffset: number, otherOffset: number, length: number): void {
        const targetLength = this.nucleotideStore.count + length;
        if (this.nucleotideStore.length < targetLength) {
            this.nucleotideStore.resize(targetLength);
        }

        this.nucleotideStore.copyWithin(thisOffset + length, thisOffset, this.length - thisOffset);
        this.nucleotideStore.copyFrom(other.nucleotideStore, thisOffset, otherOffset, length);
        this.nucleotideStore.count = targetLength;
    }

    /**
     * Removes a nucleotide but still assumes that the strand remains connected
     * Example: A-T-G-[T]-C-G-C => A-T-G--C-G-C 
     * (the -- signifies that this operation may result in an unnaturally long bond)
     * 
     * @param index index of the nucleotide to be removed
     */
    public removeNucleotideAtIndex(index: number): void {
        const np = this.getNucleotideProxy(index);
        if (np) {
            this.cleanBasePairReference(np);
            this.removeMonomerAtIndex(index);
        }
    }

    /**
     * Removes nucleotides but still assumes that the strand remains connected
     * 
     * @param indices indices of nucleotides to remove
     */
    public removeNucleotidesAtIndices(indices: number[]) {
        indices.forEach(idx => {
            const np = this.getNucleotideProxy(idx);
            if (np) {
                this.cleanBasePairReference(np);
            }
        });
        this.removeMonomersAtIndices(indices);
    }

    /**
     * Removes a nucleotide but still assumes that the strand remains connected
     * 
     * @param proxy proxy referencing nucleotide to remove
     */
    public removeNucleotide(proxy: CgNucleotideProxy) {
        this.cleanBasePairReference(proxy);
        this.removeMonomer(proxy);
    }

    /**
     * Removes nucleotides but still assumes that the strand remains connected
     * 
     * @param proxies proxies referencing nucleotides to remove
     */
    public removeNucleotides(proxies: CgNucleotideProxy[]) {
        proxies.forEach(proxy => this.cleanBasePairReference(proxy));
        this.removeMonomers(proxies);
    }

    /**
     * Breaks this strand at given nucleotide by removing it,
     * shortening this strand and returning the second part as an output.
     * If the nucleotide is 5'/3' end, no new strand is returned.
     * Example: A-T-G-[T]-C-G-C => this strand = A-T-G, returned strand = C-G-C
     * 
     * @param proxy proxy referencing nucleotide to remove
     * @returns strand following the removed nucleotide (or undefined if the nucleotide lied at 3' end)
     */
    public breakAtNucleotide(proxy: CgNucleotideProxy): CgNucleicAcidStrand | undefined {
        if (proxy.isFivePrime() || proxy.isThreePrime()) {
            this.removeNucleotide(proxy);
            this.isCircular = false;
            return undefined;
        }

        const breakIdx = proxy.index;
        this.removeNucleotide(proxy);

        if (!this.isCircular) {
            const newStrand = new CgNucleicAcidStrand(GlobalIdGenerator.generateId(),
                this.parentStructure?.generateChainName() ?? this.name, this.naType, this.parentStructure, this.length - breakIdx);
            newStrand.copyFrom(this, breakIdx, this.length);

            this.truncate(breakIdx);

            return newStrand;
        }

        // If this strand is circular, the break operation makes it acyclic.
        // The newly created "gap" then determines new strand ends and thus also the new 5'/3' nucleotides.
        // Therefore, the nucleotides in this strand have to be shifted in the array to 
        // have the new 5' at the beginning.

        this.isCircular = false;
        const newFivePrime = breakIdx;

        this.nucleotideStore.rotate(newFivePrime);

        return undefined;
    }

    /**
     * Breaks this strand after the given nucleotide, i.e., removing the 
     * connection/bond between given nucleotide and the following one.
     * In other words, it splits this strand into two parts -- first part goes from 5' 
     * to the removed nucleotide. The second part starts with the nucleotide following the removed one
     * and ends at the original 3' end.
     * Since the nucleotides are not moved in reality, the atom-level bonds are not influenced
     * by this function. Thus, it is more important for defining the routing of a given strand.
     * 
     * @param proxy proxy referencing nucleotide to become new 3' end of this strand
     * @returns part of the original strand following the referenced nucleotide
     */
    public breakAfterNucleotide(proxy: CgNucleotideProxy): CgNucleicAcidStrand | undefined {
        if (proxy.isThreePrime()) {
            this.isCircular = false;
            return undefined;
        }

        if (!this.isCircular) {
            const newStrand = new CgNucleicAcidStrand(GlobalIdGenerator.generateId(),
                this.parentStructure?.generateChainName() ?? this.name, this.naType, this.parentStructure, this.length - proxy.index - 1);
            newStrand.copyFrom(this, proxy.index + 1, this.length);

            this.truncate(proxy.index + 1);

            return newStrand;
        }

        this.isCircular = false;
        const newFivePrime = proxy.index + 1;

        this.nucleotideStore.rotate(newFivePrime);

        return undefined;
    }

    /**
     * Connects this strand to another (could be the same) strand with a bond.
     * After this operation, the "other" strand may be disposed and removed from the structure.
     * The exception to this rule is in case that the other strand equals this strand.
     * 
     * @param other strand to which the connection should be performed
     * @param connectionEnd Determines whether the connection will start at 5'/3' end of this strand
     */
    public connectTo(other: CgNucleicAcidStrand, connectionEnd: NucleicAcidStrandEnd): void {
        // TODO Add possibility to add nucleotides along the connection
        if (other === this) {
            this.isCircular = true;
        } else {
            this.insertFrom(other,
                connectionEnd === NucleicAcidStrandEnd.FIVE_PRIME ? 0 : this.length,
                0, other.length);
        }
    }

    /**
     * Checks if it is possible to connect this strand to the given nucleotide (in other or this strand)
     * 
     * @param targetNucleotide nucleotide we would like to initiate connection to
     * @param connectionEnd this strand end where the connection will start
     * @returns true if the connection can happen, false otherwise
     */
    public canConnectToNucleotide(targetNucleotide: CgNucleotideProxy, connectionEnd: NucleicAcidStrandEnd): boolean {
        return !this.isCircular && !targetNucleotide.parentStrand.isCircular &&
            ((connectionEnd === NucleicAcidStrandEnd.FIVE_PRIME && targetNucleotide.isThreePrime()) ||
                (connectionEnd === NucleicAcidStrandEnd.THREE_PRIME && targetNucleotide.isFivePrime()));
    }

    /**
     * Returns 3D location determining the starting origin of the strand extension 
     * 
     * @param directionality direction in which the extension should be performed
     * @returns position of the origin used for the extension
     */
    public getExtensionStart(directionality: NucleicAcidStrandEnd): Vector3 | undefined {
        if (directionality === NucleicAcidStrandEnd.THREE_PRIME) {
            return this.threePrime?.nucleobaseCenter;
        } else {
            return this.fivePrime?.nucleobaseCenter;
        }
    }

    /**
     * Returns direction which can be used to achieve helical-axis-aligned strand extension
     * 
     * @param directionality direction in which the extension should be performed
     * @returns direction that can be used for extension parallel to this strand axis
     */
    public getExtensionDirection(directionality: NucleicAcidStrandEnd): Vector3 | undefined {
        if (directionality === NucleicAcidStrandEnd.THREE_PRIME) {
            return computeHelicalAxis(this.threePrime!);
        } else {
            return computeHelicalAxis(this.fivePrime!).negate();
        }
    }

    /**
     * Executes a callback for each nucleotide (in 5' to 3' order)
     * 
     * @param callback function accepting nucleotide proxy and its index
     */
    public forEachNucleotide(callback: (a: CgNucleotideProxy, i: number) => void): void {
        this.commonForEach(callback);
    }

    /**
     * Executes a callback for each nucleotide (in reverse 3' to 5' order)
     * 
     * @param callback function accepting nucleotide proxy and its index
     */
    public forEachNucleotideReverse(callback: (a: CgNucleotideProxy, i: number) => void): void {
        this.commonForEachReverse(callback);
    }

    /**
     * Returns index of first nucleotide returning true for given predicate
     * 
     * @param callback function accepting nucleotide proxy and returning true if it passess the condition
     * @returns index of first nucleotide to meet the predicate
     */
    public findNucleotideIndex(pred: (a: CgNucleotideProxy) => boolean): number {
        return this.commonFindIndex(pred);
    }

    /**
     * @override
     */
    public dispose() {
        this.cleanBasePairReferences();
        super.dispose();
    }

    /**
     * @override
     */
    public proxyAtIndex(index: number): CgNucleotideProxy | null {
        return this.getNucleotideProxy(index);
    }

    /**
     * @override
     */
    public isProtein(): boolean {
        return false;
    }

    /**
     * @override
     */
    public isNucleic(): boolean {
        return true;
    }

    /**
     * @override
     */
    public isDna(): boolean {
        return this._naType === NucleicAcidType.DNA;
    }

    /**
     * @override
     */
    public isRna(): boolean {
        return this._naType === NucleicAcidType.RNA;
    }

    /**
     * @override
     */
    public isCyclic(): boolean {
        return this.isCircular;
    }

    /**
     * Removes base pair references between the given nucleotide
     * and its complementary one.
     * 
     * @param proxy nucleotide proxy to be "unpaired"
     */
    protected cleanBasePairReference(proxy: CgNucleotideProxy) {
        if (proxy.pairedNucleotide) {
            proxy.pairedNucleotide.pairedNucleotide = null;
        }
        proxy.pairedNucleotide = null;
    }

    /**
     * Ensures that no nucleotide in the parent structure references any
     * of the nucleotides which are part of this strand.
     */
    protected cleanBasePairReferences(): void {
        const ids = new Set<number>(this.nucleotideStore.globalId);

        this.parentStructure?.forEachNaStrand(str => {
            if (str !== this) {
                const ns = str.nucleotideStore;
                for (let i = 0; i < str.length; ++i) {
                    if (ids.has(ns.pairId[i])) {
                        ns.pairId[i] = -1;
                    }
                }
            }
        });
    }
}

export default CgNucleicAcidStrand;