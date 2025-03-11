import { Box3, Matrix4 } from "three";
import { Log, RepresentationElement, Structure } from "../../catana";
import MultiArrayIterator from "../utils/multi-array-iterator";
import CgAminoAcidChain from "./cg-amino-acid-chain";
import CgNucleicAcidStrand from "./cg-nucleic-acid-strand";
import CgPolymer from "./cg-polymer";
import CgAminoAcidProxy from "./proxy/cg-amino-acid-proxy";
import CgNucleotideProxy from "./proxy/cg-nucleotide-proxy";
import CgMonomerProxy from "./proxy/cg-monomer-proxy";
import CgStructureComponent from "../component/cg-structure-component";
import { generateAtomisticStructure } from "../nanomodeling/atom-generation";
import { getChainname } from "../../structure/structure-utils";
import { duplicateCgStructure } from "../utils/catana-utils";
import { MonomerType, monomerTypeToOneLetterCode } from "./types_declarations/monomer-types";
import { MethodInfluencesAtomData } from "../decorators/atom-generation-decorators";
import { StructureSignals } from "../../structure/structure";
import { Signal } from "signals";
import { autoDetectBasePairs } from "../nanomodeling/nucleic-acid-utils";
import PrincipalAxes from "../../math/principal-axes";
import { Matrix } from "../../math/matrix-utils";

/**
 * Class storing data of a single coarse-grained structure
 */
class CgStructure {
    private _parentComp: CgStructureComponent | null = null;
    private _globalId: number;
    private _name: string;
    private _author: string;

    private _naStrands: CgNucleicAcidStrand[];
    private _aaChains: CgAminoAcidChain[];

    private _idToNuclIdxMap: Map<number, [CgNucleicAcidStrand, number]>;
    private _idToAaIdxMap: Map<number, [CgAminoAcidChain, number]>;

    private _atomicStructure: Structure | null = null;
    private _chainNameCounter: number = 0;

    private _isAtomDataDirty: boolean = false;
    private _atomRebuildInProgress: boolean = false;

    public signals: StructureSignals;

    /**
     * @param globalId global ID of the newly created structure
     * @param name name of the structure
     * @param author author of the structure
     */
    constructor(globalId: number, name?: string, author?: string) {
        this._globalId = globalId;
        this._name = name ?? ("cg-structure-" + globalId);
        this._author = author ?? "Catana SW";

        this._naStrands = [];
        this._aaChains = [];

        this._idToNuclIdxMap = new Map();
        this._idToAaIdxMap = new Map();

        this.signals = {
            refreshed: new Signal()
        };
    }

    /**
     * @returns string identification of this class
     */
    public get type(): string {
        return "Coarse-grained Structure";
    }

    /**
     * @returns reference to the parent component (if assigned)
     */
    public get parentComponent(): CgStructureComponent | null {
        return this._parentComp;
    }

    /**
     * Sets new parent component reference
     */
    public set parentComponent(comp: CgStructureComponent | null) {
        this._parentComp = comp;
    }

    /**
     * Returns a reference to the underlying atomistic structure.
     * If the structure has not yet been assigned / built, then it returns null.
     */
    public get atomicStructure(): Structure | null {
        return this._atomicStructure;
    }

    /**
     * Sets atomistic structure reference
     */
    public set atomicStructure(structure: Structure | null) {
        this._atomicStructure = structure;
    }

    /**
     * @returns global ID of this structure
     */
    public get globalId(): number {
        return this._globalId;
    }

    /**
     * Sets new global ID of this structure
     */
    public set globalId(newId: number) {
        this._globalId = newId;
    }

    /**
     * @returns name of this structure
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Sets new name of this structure
     */
    public set name(newName: string) {
        this._name = newName;
    }

    /**
     * @returns author name of this structure
     */
    public get author(): string {
        return this._author;
    }

    /**
     * Sets new author name of this structure
     */
    public set author(newAuthor: string) {
        this._author = newAuthor;
    }

    /**
     * @returns list of this structure's nucleic acid strands 
     */
    public get naStrands(): CgNucleicAcidStrand[] {
        return this._naStrands;
    }

    /**
     * @returns list of this structure's amino acid chains 
     */
    public get aaChains(): CgAminoAcidChain[] {
        return this._aaChains;
    }

    /**
     * @returns array iterator of all polymers (nucleic and amino acid chains) in this structure
     */
    public get polymers(): MultiArrayIterator<CgPolymer> {
        return new MultiArrayIterator<CgPolymer>(this.naStrands, this.aaChains);
    }

    /**
     * @returns the number of nucleic acid strands in this structure
     */
    public get naStrandsCount(): number {
        return this.naStrands.length;
    }

    /**
     * @returns the number of amino acid chains in this structure
     */
    public get aaChainsCount(): number {
        return this.aaChains.length;
    }

    /**
     * @returns the total number of polymer in this structure
     */
    public get polymerCount(): number {
        return this.polymers.length;
    }

    /**
     * @returns the total number of monomers being part of this structure
     */
    public get monomerCount(): number {
        let count = 0;
        this.forEachPolymer(pol => count += pol.length);
        return count;
    }

    /**
     * Atom generation dirty flag.
     * 
     * @returns true if the atom data are dirty, i.e., need to be regenerated
     */
    public get isAtomDataDirty(): boolean {
        return this._isAtomDataDirty;
    }

    /**
     * Sets the atom data dirty flag
     */
    public set isAtomDataDirty(val: boolean) {
        this._isAtomDataDirty = val;
    }

    /**
     * Adds new nucleic acid strand to this structure
     * 
     * @param strand strand to add
     */
    @MethodInfluencesAtomData(x => x)
    public addNaStrand(strand: CgNucleicAcidStrand): void {
        strand.parentStructure = this;
        this.naStrands.push(strand);
    }

    /**
    * Adds new nucleic acid strands to this structure
    * 
    * @param strands strands to add
    */
    public addNaStrands(...strands: CgNucleicAcidStrand[]): void {
        for (let str of strands) {
            this.addNaStrand(str);
        }
    }

    /**
    * Adds new amino acid chain to this structure
    * 
    * @param chain chain to add
    */
    @MethodInfluencesAtomData(x => x)
    public addAaChain(chain: CgAminoAcidChain): void {
        chain.parentStructure = this;
        this.aaChains.push(chain);
    }


    /**
    * Adds new amino acid chains to this structure
    * 
    * @param chains chains to add
    */
    public addAaChains(chains: CgAminoAcidChain[]): void {
        for (let chain of chains) {
            this.addAaChain(chain);
        }
    }

    // TODO Some methods distinguishing between nucleic acid and amino acid chains,
    //      like .remove(NaStrand)(AaChain), may be potentially replaced by a common one and removed

    /**
    * @deprecated This method will be soon removed & replaced by .removePolymer method
    * 
    * Remmoves nucleic acid strand from the structure 
    * 
    * @param strand strand to remove
    */
    public removeNaStrand(strand: CgNucleicAcidStrand): void {
        this.removePolymer(strand);
    }

    /**
    * @deprecated This method will be soon removed & replaced by .removePolymer method
    * 
    * Remmoves amino acid chain from the structure 
    * 
    * @param chain chain to remove
    */
    public removeAaChain(chain: CgAminoAcidChain): void {
        this.removePolymer(chain);
    }

    /**
     * Removes polymer from the structure.
     * If the structure contains no polymers after the removal and has a parent component,
     * it removes the component from the stage automatically.
     * 
     * @param pol polymert to remove
     */
    @MethodInfluencesAtomData(x => x)
    public removePolymer(pol: CgPolymer): void {
        let arr: CgPolymer[] =
            pol instanceof CgNucleicAcidStrand ? this.naStrands : this.aaChains;

        const index = arr.indexOf(pol);
        if (index > -1) {
            arr.splice(index, 1);
            pol.dispose();
        }

        // If there are no polymers left, the structure is empty
        // and should be removed together with its component
        if (this.polymerCount === 0) {
            // TODO This is not a very nice solution, it would be better to employ
            //      event-based approach via Signals
            this.parentComponent?.stage.removeComponent(this.parentComponent);
        }
    }

    /**
     * Removes all polymers in this structure.
     * This function does NOT automatically remove the parent component from stage.
     * 
     * @param disposePolymers if set to true, polymers will be disposed, otherwise they are just removed from internal lists. 
     */
    @MethodInfluencesAtomData(x => x)
    public removeAllPolymers(disposePolymers: boolean = true) {
        if (disposePolymers) {
            for (let pol of this.polymers) {
                pol.dispose();
            }
        }

        this._naStrands = [];
        this._aaChains = [];
    }

    /**
     * Executes a callback on each nucleic acid strand
     * 
     * @param callback function accepting a nucleic acid strand as a parameter
     */
    public forEachNaStrand(callback: (a: CgNucleicAcidStrand) => void): void {
        this.naStrands.forEach(callback);
    }

    /**
     * Executes a callback on each amino acid chain
     * 
     * @param callback function accepting an amino acid chain as a parameter
     */
    public forEachAaChain(callback: (a: CgAminoAcidChain) => void): void {
        this.aaChains.forEach(callback);
    }

    /**
     * Executes a callback on each polymer chain
     * 
     * @param callback function accepting a coarse-grained polymer as a parameter
     */
    public forEachPolymer(callback: (a: CgPolymer) => void): void {
        this.polymers.forEach(callback);
    }

    /**
     * Executes a callback on each monomer / residue
     * 
     * @param callback function accepting monomer as a parameter
     */
    public forEachMonomer(callback: (m: CgMonomerProxy) => void): void {
        this.forEachPolymer((p) => p.forEachMonomer(callback));
    }

    /**
     * Returns first nucleic acid strand meeting the given predicate
     * 
     * @param callback boolean predicate accepting strand as a parameter
     * @returns first nucleic acid strand to return true for the provided predicate
     */
    public findNaStrand(callback: (a: CgNucleicAcidStrand) => boolean): CgNucleicAcidStrand | undefined {
        return this.naStrands.find(callback);
    }

    /**
     * Returns first amino acid chain meeting the given predicate
     * 
     * @param callback boolean predicate accepting chain as a parameter
     * @returns first amino acid chain to return true for the provided predicate
     */
    public findAaChain(callback: (a: CgAminoAcidChain) => boolean): CgAminoAcidChain | undefined {
        return this.aaChains.find(callback);
    }

    /**
     * Returns first polymer meeting the given predicate
     * 
     * @param callback boolean predicate accepting polymer as a parameter
     * @returns first nucleic acid strand to return true for the provided predicate
     */
    public findPolymer(callback: (a: CgPolymer) => boolean): CgPolymer | undefined {
        return this.polymers.find(callback);
    }

    /**
     * Gets nucleotide proxy corresponding to the given global ID.
     * This operation can take up to O(n) time w.r.t the number of nucleotides.
     * 
     * @param globalId global ID to search for
     * @returns proxy referencing a nucleotide with the desired global ID or null if not found
     */
    public getNucleotideProxy(globalId: number): CgNucleotideProxy | null {
        if (globalId < 0) {
            return null;
        }

        const strIdxPair = this._idToNuclIdxMap.get(globalId);

        // If this record already exists in the map ...
        if (strIdxPair !== undefined) {
            // ... check if the referenced strand is still valid ...
            if (strIdxPair[1] < strIdxPair[0].length) {
                let tmpProxy = strIdxPair[0].getNucleotideProxy(strIdxPair[1]);

                // ... and check if the referenced monomer has the expected ID ...
                if (tmpProxy && tmpProxy.globalId === globalId) {
                    // ... if so, return it.
                    return tmpProxy;
                } else {
                    // ... otherwise, delete the record.
                    this._idToNuclIdxMap.delete(globalId);
                }
                // If the strand is not valid, delete the record.
            } else {
                this._idToNuclIdxMap.delete(globalId);
            }
        }

        // In case there is no existing or valid record, create a new one
        let resProxy: CgNucleotideProxy | null = null;

        this.findNaStrand(strand => {
            const idx = strand.getIndexForGlobalId(globalId);
            if (idx >= 0) {
                this._idToNuclIdxMap.set(globalId, [strand, idx]);
                resProxy = strand.getNucleotideProxy(idx);
                return true;
            }
            return false;
        });

        return resProxy;
    }

    /**
    * Gets amino acid proxy corresponding to the given global ID.
    * This operation can take up to O(n) time w.r.t the number of amino acids.
    * 
    * @param globalId global ID to search for
    * @returns proxy referencing an amino acid with the desired global ID or null if not found
    */
    public getAminoAcidProxy(globalId: number): CgAminoAcidProxy | null {
        if (globalId < 0) {
            return null;
        }

        const chainIdxPair = this._idToAaIdxMap.get(globalId);

        if (chainIdxPair !== undefined) {
            if (chainIdxPair[1] < chainIdxPair[0].length) {
                let tmpProxy = chainIdxPair[0].getAminoAcidProxy(chainIdxPair[1]);

                if (tmpProxy && tmpProxy.globalId === globalId) {
                    return tmpProxy;
                } else {
                    this._idToAaIdxMap.delete(globalId);
                }
            } else {
                this._idToAaIdxMap.delete(globalId);
            }
        }

        let resProxy: CgAminoAcidProxy | null = null;

        this.findAaChain(chain => {
            const idx = chain.getIndexForGlobalId(globalId);
            if (idx >= 0) {
                this._idToAaIdxMap.set(globalId, [chain, idx]);
                resProxy = chain.getAminoAcidProxy(idx);
                return true;
            }
            return false;
        });

        return resProxy;
    }

    /**
     * Returns monomer proxy corresponding to the given global ID.
     * This operation can take up to O(n) time w.r.t the number of monomers.
     * 
     * @param globalId global ID to search for
     * @returns monomer proxy with the given global ID or null if not found
     */
    public getMonomerProxy(globalId: number): CgMonomerProxy | null {
        return this.getNucleotideProxy(globalId) ?? this.getAminoAcidProxy(globalId);
    }

    /**
     * Returns nucleic acid strand with the given global ID
     * 
     * @param globalId global ID to search for
     * @returns strand with the sought global ID, or undefined if not found
     */
    public getNaStrand(globalId: number): CgNucleicAcidStrand | undefined {
        return this.naStrands.find(x => x.globalId === globalId);
    }

    /**
     * Returns amino acid chain with the given global ID
     * 
     * @param globalId global ID to search for
     * @returns chain with the sought global ID, or undefined if not found
     */
    public getAaChain(globalId: number): CgAminoAcidChain | undefined {
        return this.aaChains.find(x => x.globalId === globalId);
    }

    /**
     * Returns AABB of this structure
     * 
     * @param box box object into which the function outcome will be stored
     * @returns reference to provided (or new) Box3 instance storing the AABB data
     */
    public getBoundingBox(box?: Box3): Box3 {
        const resBox = box ?? new Box3();
        const tmpBox = new Box3();

        resBox.makeEmpty();

        this.naStrands.forEach(strand => {
            if (strand.length > 0) {
                tmpBox.setFromArray(strand.nucleotideStore.bbCenter.subarray(0, strand.length * 3));
                resBox.union(tmpBox);
            }
        });

        this.aaChains.forEach(chain => {
            if (chain.length > 0) {
                tmpBox.setFromArray(chain.aminoAcidStore.caPosition.subarray(0, chain.length * 3));
                resBox.union(tmpBox);
            }
        });

        return resBox;
    }

    /**
     * Transforms all polymers in this structure with the given matrix.
     * 
     * @param m transformation matrix
     */
    public transform(m: Matrix4): void {
        if (!m.determinant()) {
            return;
        }

        this.forEachPolymer(pol => {
            pol.applyMatrixTransformation(m);
        });
    }

    /**
     * @returns an array of string sequences of structure's polymers.
     */
    public getSequence(): string[] {
        // NOTE
        // If converting to one-letter codes, keep in mind that there is an overlap
        // between DNA and some amino acid codes!
        // Therefore, they will not be distinguishable.
        return this.getSequenceFormatted(monomerTypeToOneLetterCode);
    }

    /**
     * Returns an array of callback-converted sequences of structure's polymers.
     * 
     * @param convFunc conversion function accepting monomer type and its parent polymer, returning converted value.
     * The callback is executed on each monomer for all of the polymers in this structure.
     * @returns array of polymer sequences processed by the provided callback function
     */
    public getSequenceFormatted<T>(convFunc: (input: MonomerType, pol: CgPolymer) => T): T[] {
        let seq: T[] = [];

        this.forEachPolymer(cgPol => {
            const polSeq = cgPol.sequence;

            polSeq.forEach(monType => {
                seq.push(convFunc(monType, cgPol));
            })
        });

        return seq;
    }

    /**
    * Computation of principal axes of this structure.
    * 
    * @returns the principal axes of the structure monomers
    */
    getPrincipalAxes(): PrincipalAxes {
        let i = 0;
        const coords = new Matrix(3, this.monomerCount);
        const cd = coords.data;

        this.forEachMonomer(mon => {
            const pos = mon.position;

            cd[i++] = pos.x;
            cd[i++] = pos.y;
            cd[i++] = pos.z;
        });

        return new PrincipalAxes(coords);
    }

    /**
     * Auto-computes base-pairs in the whole structure
     * 
     * @param replaceExisting if set to true, the auto-computation may discard existing base-pairs.
     * Otherwise, they will remain untouched.
     */
    public generateBasePairs(replaceExisting: boolean = false): void {
        autoDetectBasePairs(this, replaceExisting);
    }

    /**
     * Tries to refresh structural data if it identifies a need to do so
     */
    public refreshStructureIfNeeded(): void {
        if (!this._atomRebuildInProgress && this.isAtomDataDirty) {
            if (this.atomicStructure !== null) {
                // TODO This is very inoptimally hacked! Improve to a proper solution...

                let reprToRemove: RepresentationElement[] = [];
                let atReprWasVisible: boolean = true;
                let atReprFilter: string = "";
                this.parentComponent?.eachRepresentation(repr => {
                    if (repr.repr.type === "atomic") {
                        atReprWasVisible = repr.repr.visible;
                        atReprFilter = repr.repr.filterString;
                        reprToRemove.push(repr);
                    }
                })

                if (reprToRemove.length === 0) {
                    atReprWasVisible = false;
                } else {
                    reprToRemove.forEach(reprElem => this.parentComponent?.removeRepresentation(reprElem));
                }

                this.buildAtomicStructure(true).then(s => {
                    const reprElem = this.parentComponent?.addRepresentation("atomic");
                    reprElem?.setVisibility(atReprWasVisible);
                    reprElem?.setFilter(atReprFilter);
                });
            }
            this.isAtomDataDirty = false;
            this.signals.refreshed.dispatch();
        }
    }

    /**
     * Generates atoms for the underlying atomistic structure.
     * 
     * @param forceRebuild if set to true, the structure will be rebuilt even if a valid one alredy exists
     * @returns promise referencing the function generating the new atomistic data
     */
    public buildAtomicStructure(forceRebuild: boolean = false): Promise<Structure> {
        return new Promise<Structure>((resolve, reject) => {
            if (this._atomRebuildInProgress) {
                return;
            }

            if (!forceRebuild && this.atomicStructure !== null) {
                resolve(this.atomicStructure);
                return;
            }

            this._atomRebuildInProgress = true;
            const existingStructure = this.atomicStructure ?? undefined;
            this.atomicStructure = null;

            generateAtomisticStructure(this, existingStructure).then(s => {
                this._atomicStructure = s;
                this._atomRebuildInProgress = false;
                resolve(this._atomicStructure);
            }, (e) => {
                Log.warn(e);
                this.atomicStructure = null;
                this._atomRebuildInProgress = false;
                reject("Maximum number of atoms reached!");
            });
        });
    }

    /**
     * Generates a new structure-wise unique (hopefully) chain name
     * 
     * @returns new chain name
     */
    public generateChainName(): string {
        this._chainNameCounter = Math.max(this._chainNameCounter, this.polymerCount);
        return getChainname(this._chainNameCounter);
    }

    /**
     * Disposes of the structural data
     */
    public dispose() {
        for (let pol of this.polymers) {
            pol.dispose();
        }
    }

    /**
     * Creates a copy of itself, including the polymers and other data.
     * 
     * @returns new structure being a copy of this one
     */
    public clone(): CgStructure {
        return duplicateCgStructure(this);
    }

    /**
     * Returns a string containing some information about the structure
     * 
     * @returns string with information about the structure
     */
    public toString(): string {
        let res = "";

        res += "Global ID: " + this.globalId + "\n";
        res += "Total chain records: " + this.polymerCount + "\n";
        res += "Total residue records: " + this.monomerCount + "\n";
        res += "\nComponent details:\n";
        this.forEachPolymer(pol => {
            res += "- " + (pol.isProtein() ? "protein" : "nucleic acid") +
                " chain " + pol.name + " (ID " + pol.globalId + ") of length " + pol.length + ".\n";
        });

        return res;
    }
}

export default CgStructure;