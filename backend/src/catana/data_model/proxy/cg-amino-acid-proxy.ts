import CgAminoAcidChain from "../cg-amino-acid-chain";
import CgAminoAcidStore from "../store/cg-amino-acid-store";
import CgMonomerProxy from "./cg-monomer-proxy";
import { AminoAcidType, aminoAcidTypeToThreeLetterCode } from '../types_declarations/monomer-types';
import { Matrix4, Vector3 } from "three";
import { AccessorInfluencesAtomData } from "../../decorators/atom-generation-decorators";

/**
 * Amino acid proxy class provides an abstracted view onto a single amino acid residue data
 * 
 * See the Unified Nanotechnology Format documentation of the meaning of amino acid positional parameters:
 * https://github.com/barisicgroup/unf
 */
class CgAminoAcidProxy extends CgMonomerProxy {
    /**
     * This property is used for retrieving CA position.
     * It is used to avoid allocating new memory
     * during every call to the selected proxy properties.
     */
    private _tmpCaPos: Vector3;

    /**
    * @param index index corresponding to the position of this amino acid's data in the parent chain's store
    * @param parentChain parent chain of this amino acid
    */
    public constructor(index: number, parentChain: CgAminoAcidChain) {
        super(index, parentChain);
    }

    /**
     * @returns Parent chain of this amino acid
     */
    public get parentChain(): CgAminoAcidChain {
        return this.parentPolymer as CgAminoAcidChain;
    }

    /** @override */
    public get globalId(): number {
        return this.aminoAcidStore.globalId[this.index];
    }

    /** @override */
    public set globalId(newId: number) {
        this.aminoAcidStore.globalId[this.index] = newId;
    }

    /** @override */
    public get pdbId(): number {
        return this.aminoAcidStore.pdbId[this.index];
    }

    /** @override */
    public set pdbId(newId: number) {
        this.aminoAcidStore.pdbId[this.index] = newId;
    }

    /**
     * @returns Amino acid type
     */
    @AccessorInfluencesAtomData(x => x.parentChain.parentStructure)
    public get aminoAcidType(): AminoAcidType {
        return this.aminoAcidStore.getType(this.index);
    }

    /**
     * Sets new amino acid type
     */
    public set aminoAcidType(nbType: AminoAcidType) {
        this.aminoAcidStore.setType(this.index, nbType);
    }

    /**
     * @returns Reference to an internal vector storing current alpha carbon location.
     * The data of this vector are updated on every call of this function.
     */
    @AccessorInfluencesAtomData(x => x.parentChain.parentStructure)
    public get alphaCarbonLocation(): Vector3 {
        return this.aminoAcidStore.getAlphaCarbonLocation(this.index, this._tmpCaPos);
    }

    /**
     * Stores alpha carbon location to the provided vector
     * 
     * @param data Vector where the location should be stored
     * @returns Reference to the provided vector
     */
    public alphaCarbonLocationToVector(data: Vector3): Vector3 {
        return this.aminoAcidStore.getAlphaCarbonLocation(this.index, data);
    }

    /**
     * Sets new location of the alpha carbon
     */
    public set alphaCarbonLocation(vec: Vector3) {
        this.aminoAcidStore.setAlphaCarbonLocation(this.index, vec);
    }

    /**
     * @returns True if this amino acid lies at the N-terminus of the chain
     */
    public isNterm(): boolean {
        return this.isChainStart();
    }

    /**
     * @returns True if this amino acid lies at the C-terminus of the chain
     */
    public isCterm(): boolean {
        return this.isChainEnd();
    }

    /** @override */
    public get residueName(): string {
        const type = this.aminoAcidStore.getType(this.index);
        return this.parentPolymer.isDna() ? "D" : "" + aminoAcidTypeToThreeLetterCode(type);
    }

    /** @override */
    public get position(): Vector3 {
        return this.alphaCarbonLocation;
    }

    /** @override */
    public applyMatrixTransformation(matrix: Matrix4): void {
        this.alphaCarbonLocation = this.alphaCarbonLocation.applyMatrix4(matrix);
    }

    /** @override */
    public clone(): CgAminoAcidProxy {
        return new CgAminoAcidProxy(this.index, this.parentChain);
    }

    /**
     * @returns Reference to the amino acid store of the parent chain
    */
    private get aminoAcidStore(): CgAminoAcidStore {
        return this.parentChain.aminoAcidStore;
    }
}

export default CgAminoAcidProxy;