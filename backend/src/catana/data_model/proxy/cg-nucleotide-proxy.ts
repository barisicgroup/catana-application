import CgNucleicAcidStrand from "../cg-nucleic-acid-strand";
import CgNucleotideStore from "../store/cg-nucleotide-store";
import {
    isPurineNucleobase,
    isPyrimidineNucleobase,
    monomerTypeToOneLetterCode,
    NucleobaseType
} from '../types_declarations/monomer-types';
import CgMonomerProxy from "./cg-monomer-proxy";
import { Matrix4, Vector3 } from "three";
import { getNucleobaseChangeTransformation } from "../../nanomodeling/nucleic-acid-utils";
import NucleicAcidStructuresProvider from "../../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import { AccessorInfluencesAtomData } from "../../decorators/atom-generation-decorators";

/**
 * Nucleotide proxy class provides an abstracted view onto a single nucleotide data
 * 
 * See the Unified Nanotechnology Format documentation of the meaning of nucleotide positional parameters:
 * https://github.com/barisicgroup/unf
 */
class CgNucleotideProxy extends CgMonomerProxy {
    /* 
     These _tmp* properties are used to avoid allocating new memory
     during every call to the selected proxy properties
    */
    private _tmpBaseNormal: Vector3;
    private _tmpHydrogenFaceDir: Vector3;
    private _tmpNucleobaseCenter: Vector3;
    private _tmpBackboneCenter: Vector3;

    /**
    * @param index index corresponding to the position of this nucleotide's data in the parent strand's store
    * @param parentStrand parent strand of this nucleotide
    */
    public constructor(index: number, parentStrand: CgNucleicAcidStrand) {
        super(index, parentStrand);
    }

    /**
     * @returns Parent strand of this nucleotide
     */
    public get parentStrand(): CgNucleicAcidStrand {
        return this.parentPolymer as CgNucleicAcidStrand;
    }

    /**
     * @returns The type of this nucleo(tide)(base)
     */
    @AccessorInfluencesAtomData(x => x.parentStrand.parentStructure)
    public get nucleobaseType(): NucleobaseType {
        return this.nucleotideStore.getType(this.index);
    }

    /**
     * Changes this nucleotide's base type.
     * This change may influence also the positional parameters of this nucleobase,
     * which might get rotated to preserve the same origin-base & origin-backbone vectors
     * as before the change.
     */
    public set nucleobaseType(nbType: NucleobaseType) {
        if (nbType === this.nucleobaseType) {
            return;
        }

        const oldRefData = NucleicAcidStructuresProvider.nucleicAcidStructures?.get(this.parentStrand.naType)?.get(this.nucleobaseType);
        const newRefData = NucleicAcidStructuresProvider.nucleicAcidStructures?.get(this.parentStrand.naType)?.get(nbType);

        // Call to "isTypeSet" ensures that this condition will be ignored during the first
        // setting of the nucleobase type
        if (this.nucleotideStore.isTypeSet(this.index) && oldRefData && newRefData) {
            const oldBasis = new Matrix4().makeBasis(
                this.baseShortAxis,
                this.hydrogenFaceDir,
                this.baseNormal);

            const currOrigin = this.nucleobaseCenter.sub(oldRefData.originToBaseCenter.clone().applyMatrix4(oldBasis));
            const newBaseTransf = getNucleobaseChangeTransformation(newRefData, oldRefData, oldBasis);

            const currOriginToBase = newRefData.originToBaseCenter.clone()
                .applyMatrix4(oldBasis)
                .applyQuaternion(newBaseTransf);

            const currOriginToBb = newRefData.originToBackboneCenter.clone()
                .applyMatrix4(oldBasis)
                .applyQuaternion(newBaseTransf);

            this.hydrogenFaceDir = this.hydrogenFaceDir.clone().applyQuaternion(newBaseTransf);
            this.nucleobaseCenter = currOrigin.clone().add(currOriginToBase);
            this.backboneCenter = currOrigin.clone().add(currOriginToBb);
        }
        else if (!oldRefData || !newRefData) {
            console.error("Reference data not found!", this.nucleobaseType, oldRefData, nbType, newRefData);
        }

        this.nucleotideStore.setType(this.index, nbType);
    }

    /**
    * @returns Raw char code corresponding to the nucleobase type
    */
    public get nucleobaseTypeCharCode(): number {
        return this.nucleotideStore.getTypeCharCode(this.index);
    }

    /** @override */
    public get globalId(): number {
        return this.nucleotideStore.globalId[this.index];
    }

    /** @override */
    public set globalId(newId: number) {
        this.nucleotideStore.globalId[this.index] = newId;
    }

    /** @override */
    public get pdbId(): number {
        return this.nucleotideStore.pdbId[this.index];
    }

    /** @override */
    public set pdbId(newId: number) {
        this.nucleotideStore.pdbId[this.index] = newId;
    }

    /**
     * @returns Global ID of the base-paired nucleotide (or -1 if none exists)
     */
    public get pairId(): number {
        return this.nucleotideStore.pairId[this.index];
    }

    /**
     * Sets paired nucleotide identified by its global ID
     */
    public set pairId(newId: number) {
        this.nucleotideStore.pairId[this.index] = newId;
    }

    /**
     * @returns Reference to proxy corresponding to the paired nucleotide.
     * This operation may take up to O(n) time w.r.t the number of nucleotides in the parent structure.
     */
    public get pairedNucleotide(): CgNucleotideProxy | null {
        return this.parentStructure?.getNucleotideProxy(this.pairId) || null;
    }

    /**
     * Sets new paired nucleotide (by storing its global ID)
     */
    public set pairedNucleotide(nucl: CgNucleotideProxy | null) {
        this.pairId = nucl?.globalId ?? -1;
    }

    /**
     * @returns Reference to an internal vector storing current nucleobase center location.
     * The data of this vector are updated on every call of this function.
     */
    @AccessorInfluencesAtomData(x => x.parentStrand.parentStructure)
    public get nucleobaseCenter(): Vector3 {
        return this.nucleotideStore.getNucleobaseCenter(this.index, this._tmpNucleobaseCenter);
    }

    /**
     * Stores nucleobase center location to the provided vector
     * 
     * @param data Vector where the location should be stored
     * @returns Reference to the provided vector
     */
    public nucleobaseCenterToVector(data: Vector3): Vector3 {
        return this.nucleotideStore.getNucleobaseCenter(this.index, data);
    }

    /**
     * Sets new nucleobase center location
     */
    public set nucleobaseCenter(vec: Vector3) {
        this.nucleotideStore.setNucleobaseCenter(this.index, vec);
    }

    /**
    * @returns Reference to an internal vector storing current backbone center location.
    * The data of this vector are updated on every call of this function.
    */
    @AccessorInfluencesAtomData(x => x.parentStrand.parentStructure)
    public get backboneCenter(): Vector3 {
        return this.nucleotideStore.getBackboneCenter(this.index, this._tmpBackboneCenter);
    }

    /**
     * Stores backbone center location to the provided vector
     * 
     * @param data Vector where the location should be stored
     * @returns Reference to the provided vector
     */
    public backboneCenterToVector(data: Vector3): Vector3 {
        return this.nucleotideStore.getBackboneCenter(this.index, data);
    }

    /**
    * Sets new backbone center location
    */
    public set backboneCenter(vec: Vector3) {
        this.nucleotideStore.setBackboneCenter(this.index, vec);
    }

    /**
    * @returns Reference to an internal vector storing current base normal.
    * The data of this vector are updated on every call of this function.
    */
    @AccessorInfluencesAtomData(x => x.parentStrand.parentStructure)
    public get baseNormal(): Vector3 {
        return this.nucleotideStore.getBaseNormal(this.index, this._tmpBaseNormal);
    }

    /**
     * Stores base normal to the provided vector
     * 
     * @param data Vector where the normal should be stored
     * @returns Reference to the provided vector
     */
    public baseNormalToVector(data: Vector3): Vector3 {
        return this.nucleotideStore.getBaseNormal(this.index, data);
    }

    /**
    * Sets new base normal
    */
    public set baseNormal(vec: Vector3) {
        this.nucleotideStore.setBaseNormal(this.index, vec);
    }

    /**
   * @returns Reference to an internal vector storing current hydrogen face direction.
   * The data of this vector are updated on every call of this function.
   */
    @AccessorInfluencesAtomData(x => x.parentStrand.parentStructure)
    public get hydrogenFaceDir(): Vector3 {
        return this.nucleotideStore.getHydrogenFaceDir(this.index, this._tmpHydrogenFaceDir);
    }

    /**
    * Stores hydrogen face direction to the provided vector
    * 
    * @param data Vector where the direction should be stored
    * @returns Reference to the provided vector
    */
    public hydrogenFaceDirToVector(data: Vector3): Vector3 {
        return this.nucleotideStore.getHydrogenFaceDir(this.index, data);
    }

    /**
      * Sets new hydrogen face direction
    */
    public set hydrogenFaceDir(vec: Vector3) {
        this.nucleotideStore.setHydrogenFaceDir(this.index, vec);
    }

    /**
     * @returns Direction of the base short axis
     */
    public get baseShortAxis(): Vector3 {
        return this.hydrogenFaceDir.clone().cross(this.baseNormal);
    }

    /**
     * @returns True if this nucleotide lies at the 5' end of the parent strand
     */
    public isFivePrime(): boolean {
        return this.isChainStart();
    }

    /**
     * @returns True if this nucleotide lies at the 3' end of the parent strand
     */
    public isThreePrime(): boolean {
        return this.isChainEnd();
    }

    /**
     * @returns True if this nucleotide contains purine nucleobase
     */
    public isPurine(): boolean {
        return isPurineNucleobase(this.nucleobaseType);
    }

    /**
     * @returns True if this nucleotide contains pyrimidine nucleobase
     */
    public isPyrimidine(): boolean {
        return isPyrimidineNucleobase(this.nucleobaseType);
    }

    /**
     * @returns Reference to the underlying nucleotide store
     */
    private get nucleotideStore(): CgNucleotideStore {
        return this.parentStrand.nucleotideStore;
    }

    /** @override */
    public get residueName(): string {
        const type = this.nucleotideStore.getType(this.index);
        return (this.parentPolymer.isDna() ? "D" : "") + monomerTypeToOneLetterCode(type);
    }

    /** @override */
    public get position(): Vector3 {
        return this.backboneCenter;
    }

    /** @override */
    public applyMatrixTransformation(matrix: Matrix4): void {
        const rot = new Matrix4().extractRotation(matrix);

        this.nucleobaseCenter = this.nucleobaseCenter.applyMatrix4(matrix);
        this.backboneCenter = this.backboneCenter.applyMatrix4(matrix);
        this.baseNormal = this.baseNormal.applyMatrix4(rot).normalize();
        this.hydrogenFaceDir = this.hydrogenFaceDir.applyMatrix4(rot).normalize();
    }

    /** @override */
    public clone(): CgNucleotideProxy {
        return new CgNucleotideProxy(this.index, this.parentStrand);
    }
}

export default CgNucleotideProxy;