import CgPolymer from "../cg-polymer";
import CgStructure from "../cg-structure";
import { Matrix4, Vector3 } from "three";

/**
 * Monomer proxy class provides an abstracted view onto a single monomer data
 */
abstract class CgMonomerProxy {
    private _index: number;
    private _parentPolymer: CgPolymer;

    /**
     * @param index index corresponding to the position of this monomer's data in the parent polymer's store
     * @param parentPolymer parent polymer of this monomer
     */
    constructor(index: number, parentPolymer: CgPolymer) {
        this._index = index;
        this._parentPolymer = parentPolymer;
    }

    /**
     * @returns Index stores the location of this residue data 
     * in the corresponding store
     */
    public get index(): number {
        return this._index;
    }

    /**
     * @param newIdx Index to which this proxy refers to
     */
    public set index(newIdx: number) {
        this._index = newIdx;
    }

    /**
     * @returns Parent structure of this monomer if set, otherwise undefined
     */
    public get parentStructure(): CgStructure | undefined {
        return this.parentPolymer.parentStructure;
    }

    /**
     * @returns Parent polymer
     */
    public getParentPolymer(): CgPolymer {
        return this.parentPolymer;
    }

    /**
     * @returns Global ID of this monomer
     */
    public abstract get globalId(): number;

    /**
     * @param newId New global ID of this monomer
     */
    public abstract set globalId(newId: number);

    /**
     * @returns residue index of the corresponding residue in atomistic structure belonging
     * to the parent coarse-grained structure. If no valid data exist, returns -1.
     */
    public abstract get pdbId(): number;

    /**
     * @param newId residue index of the corresponding all-atom residue
     */
    public abstract set pdbId(newId: number);

    /**
    * @returns Parent polymer
    */
    protected get parentPolymer(): CgPolymer {
        return this._parentPolymer;
    }

    /**
     * @param newChain Sets new parent polymer
     */
    protected set parentPolymer(newChain: CgPolymer) {
        this._parentPolymer = newChain;
    }

    /**
     * @returns True if this monomer lies at the end of the chain, false otherwise.
     */
    protected isChainEnd(): boolean {
        return this.index === this.parentPolymer.length - 1;
    }

    /**
     * @returns True if this monomer lies at the start of the chain, false otherwise.
     */
    protected isChainStart(): boolean {
        return this.index === 0;
    }

    /**
     * @returns PDB-compatible residue name of this monomer
     */
    public abstract get residueName(): string;

    /**
     * @returns structure-wise unique number corresponding to this residue
     */
    public get residueNumber(): number {
        return this.globalId;
        // TODO Global ID is now used always for consistency
        //      instead of e.g. pdbId which might not be always defined.
        //      Is this good approach or some other ID should be used/created?
    }

    /**
     * Applies transformation to the coordinates of this monomer
     * @param matrix Transformation matrix
     */
    public abstract applyMatrixTransformation(matrix: Matrix4): void;

    /**
     * @returns x-coordinate of this monomer's backbone
     */
    public get x(): number {
        return this.position.x;
    }

    /**
     * @returns y-coordinate of this monomer's backbone
     */
    public get y(): number {
        return this.position.y;
    }

    /**
     * @returns z-coordinate of this monomer's backbone
     */
    public get z(): number {
        return this.position.z;
    }

    /**
     * @returns backbone position corresponding to this monomer
     */
    public abstract get position(): Vector3;

    /**
     * Clones this proxy to make a new class instance refering
     * to the same element
     */
    public abstract clone(): CgMonomerProxy;
}

export default CgMonomerProxy;