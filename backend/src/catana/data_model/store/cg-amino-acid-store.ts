import { Vector3 } from "three";
import { StoreField } from "../../../store/store";
import { AminoAcidType, monomerTypeToOneLetterCode, oneLetterCodeToAminoAcidType } from "../types_declarations/monomer-types";
import CgMonomerStore from "./cg-monomer-store";

/**
 * Sequential storage of amino acids' data (in N-term to C-term order)
 */
export default class CgAminoAcidStore extends CgMonomerStore {
    aaType: Uint8Array;
    caPosition: Float32Array;

    get _defaultFields() {
        return [
            ...super._defaultFields,
            ...[
                ['aaType', 1, 'uint8'],
                ['caPosition', 3, 'float32'],
            ]] as StoreField[];
    }

    /**
     * Returns type of the given amino acid
     * 
     * @param i index of the referenced amino acid
     * @returns Type of amino acid stored at given index
     */
    public getType(i: number): AminoAcidType {
        return oneLetterCodeToAminoAcidType(String.fromCharCode(this.aaType[i]));
    }

    /**
     * Sets type of the given amino acid 
     * 
     * @param i index of the referenced amino acid
     * @param type new amino acid type
     */
    public setType(i: number, type: AminoAcidType): void {
        this.aaType[i] = monomerTypeToOneLetterCode(type).charCodeAt(0);
    }

    /**
     * Sets new alpha carbon location
     * 
     * @param i index of the referenced amino acid
     * @param data array containing the new location data
     */
    public setAlphaCarbonLocationFromArray(i: number, data: number[]): void {
        this.vectorDataFromArray(this.caPosition, i, data);
    }

    /**
    * Sets new alpha carbon location
    * 
    * @param i index of the referenced amino acid
    * @param data vector containing the new location data
    */
    public setAlphaCarbonLocation(i: number, data: Vector3): void {
        this.vectorDataFromVector3(this.caPosition, i, data);
    }

    /**
     * Stores alpha carbon location into the provided array
     * 
     * @param i index of the referenced amino acid
     * @param data array where the location should be stored (if not provided, new array is initialized)
     * @returns reference to the array storing the data
     */
    public getAlphaCarbonLocationToArray(i: number, data?: number[]): number[] {
        return this.vectorDataToArray(this.caPosition, i, data);
    }

    /**
    * Stores alpha carbon location into the provided vector
    * 
    * @param i index of the referenced amino acid
    * @param data vector where the location should be stored (if not provided, new vector is initialized)
    * @returns reference to the vector storing the data
    */
    public getAlphaCarbonLocation(i: number, data?: Vector3): Vector3 {
        return this.vectorDataToVector3(this.caPosition, i, data);
    }
}