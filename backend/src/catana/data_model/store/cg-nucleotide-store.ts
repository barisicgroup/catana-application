import { Vector3 } from 'three';
import { StoreField } from '../../../store/store'
import { monomerTypeToOneLetterCharCode, NucleobaseType, oneLetterCodeToNucleobaseType } from '../types_declarations/monomer-types';
import CgMonomerStore from './cg-monomer-store';

/**
 * Sequential storage of nucleotides' data (in 5' to 3' order)
 */
export default class CgNucleotideStore extends CgMonomerStore {
    nbType: Uint8Array;
    /**
     * Array storing global IDs of nucleotides paired to nucleotide at 'index' (or -1 if there is no existing pair)
     */
    pairId: Int32Array;
    nbCenter: Float32Array;
    bbCenter: Float32Array;
    baseNormal: Float32Array;
    hydrogenFaceDir: Float32Array;

    get _defaultFields() {
        return [
            ...super._defaultFields,
            ...[
                ['nbType', 1, 'uint8'],
                ['pairId', 1, 'int32'],
                ['nbCenter', 3, 'float32'],
                ['bbCenter', 3, 'float32'],
                ['baseNormal', 3, 'float32'],
                ['hydrogenFaceDir', 3, 'float32'],
            ]] as StoreField[];
    }

    /**
     * Checks if the nucleobase type at given index has already been set or is still default-initialized
     * 
     * @param i index to check
     * @returns true if type has been set (i.e., is non-zero), false otherwise
     */
    public isTypeSet(i: number): boolean {
        return this.nbType[i] !== 0;
    }

    /**
     * Returns type of the given nucleotide
     * 
     * @param i index of the referenced nucleotide
     * @returns Type of nucleotide stored at given index
     */
    public getType(i: number): NucleobaseType {
        return oneLetterCodeToNucleobaseType(String.fromCharCode(this.nbType[i]));
    }

    /**
     * Sets type of the given nucleotide
     * 
     * @param i index of the referenced nucleotide
     * @param type new nucleotide type
     */
    public setType(i: number, type: NucleobaseType): void {
        this.nbType[i] = monomerTypeToOneLetterCharCode(type);
    }

    /**
     * @param i index of the referenced nucleotide
     * @returns raw uint8 value / char code corresponding to the nucleobase type
     */
    public getTypeCharCode(i: number): number {
        return this.nbType[i];
    }

    /**
     * Sets new nucleobase center location from the provided array
     * 
     * @param i index of the referenced nucleotide
     * @param data array with the source data
     */
    public setNucleobaseCenterFromArray(i: number, data: number[]): void {
        this.vectorDataFromArray(this.nbCenter, i, data);
    }

    /**
     * Sets new backbone center location from the provided array
     * 
     * @param i index of the referenced nucleotide
     * @param data array with the source data
     */
    public setBackboneCenterFromArray(i: number, data: number[]): void {
        this.vectorDataFromArray(this.bbCenter, i, data);
    }

    /**
     * Sets new base normal from the provided array
     * 
     * @param i index of the referenced nucleotide
     * @param data array with the source data
     */
    public setBaseNormalFromArray(i: number, data: number[]): void {
        this.vectorDataFromArray(this.baseNormal, i, data);
    }

    /**
     * Sets new hydrogen face direction from the provided array
     * 
     * @param i index of the referenced nucleotide
     * @param data array with the source data
     */
    public setHydrogenFaceDirFromArray(i: number, data: number[]): void {
        this.vectorDataFromArray(this.hydrogenFaceDir, i, data);
    }

    /**
     * Sets new nucleobase center location from the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector with the source data
     */
    public setNucleobaseCenter(i: number, data: Vector3): void {
        this.vectorDataFromVector3(this.nbCenter, i, data);
    }

    /**
     * Sets new backbone center location from the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector with the source data
     */
    public setBackboneCenter(i: number, data: Vector3): void {
        this.vectorDataFromVector3(this.bbCenter, i, data);
    }

    /**
     * Sets new base normal from the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector with the source data
     */
    public setBaseNormal(i: number, data: Vector3): void {
        this.vectorDataFromVector3(this.baseNormal, i, data);
    }

    /**
     * Sets new hydrogen face direction from the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector with the source data
     */
    public setHydrogenFaceDir(i: number, data: Vector3): void {
        this.vectorDataFromVector3(this.hydrogenFaceDir, i, data);
    }

    /**
     * Stores nucleobase center location into the provided array
     * 
     * @param i index of the referenced nucleotide
     * @param data array where the data should be stored (if not provided, new array is initialized)
     * @returns reference to the array storing the data
     */
    public getNucleobaseCenterToArray(i: number, data?: number[]): number[] {
        return this.vectorDataToArray(this.nbCenter, i, data);
    }

    /**
    * Stores backbone center location into the provided array
    * 
    * @param i index of the referenced nucleotide
    * @param data array where the data should be stored (if not provided, new array is initialized)
    * @returns reference to the array storing the data
    */
    public getBackboneCenterToArray(i: number, data?: number[]): number[] {
        return this.vectorDataToArray(this.bbCenter, i, data);
    }

    /**
    * Stores base normal into the provided array
    * 
    * @param i index of the referenced nucleotide
    * @param data array where the data should be stored (if not provided, new array is initialized)
    * @returns reference to the array storing the data
    */
    public getBaseNormalToArray(i: number, data?: number[]): number[] {
        return this.vectorDataToArray(this.baseNormal, i, data);
    }

    /**
    * Stores hydrogen face direction into the provided array
    * 
    * @param i index of the referenced nucleotide
    * @param data array where the data should be stored (if not provided, new array is initialized)
    * @returns reference to the array storing the data
    */
    public getHydrogenFaceDirToArray(i: number, data?: number[]): number[] {
        return this.vectorDataToArray(this.hydrogenFaceDir, i, data);
    }

    /**
     * Stores nucleobase center location into the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector where the data should be stored (if not provided, new vector is initialized)
     * @returns reference to the vector storing the data
     */
    public getNucleobaseCenter(i: number, data?: Vector3): Vector3 {
        return this.vectorDataToVector3(this.nbCenter, i, data);
    }

    /**
     * Stores backbone center location into the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector where the data should be stored (if not provided, new vector is initialized)
     * @returns reference to the vector storing the data
     */
    public getBackboneCenter(i: number, data?: Vector3): Vector3 {
        return this.vectorDataToVector3(this.bbCenter, i, data);
    }

    /**
     * Stores base normal into the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector where the data should be stored (if not provided, new vector is initialized)
     * @returns reference to the vector storing the data
     */
    public getBaseNormal(i: number, data?: Vector3): Vector3 {
        return this.vectorDataToVector3(this.baseNormal, i, data);
    }

    /**
     * Stores hydrogen face direction into the provided vector
     * 
     * @param i index of the referenced nucleotide
     * @param data vector where the data should be stored (if not provided, new vector is initialized)
     * @returns reference to the vector storing the data
     */
    public getHydrogenFaceDir(i: number, data?: Vector3): Vector3 {
        return this.vectorDataToVector3(this.hydrogenFaceDir, i, data);
    }
}