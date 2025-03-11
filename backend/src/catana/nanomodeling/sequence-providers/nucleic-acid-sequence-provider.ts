import { NucleobaseType } from "../../data_model/types_declarations/monomer-types";

/**
 * Base class providing features to retrieve/generate nucleic acid sequence
 */
export abstract class NucleicAcidSequenceProvider {
    /**
     * Returns nucleobase type at given index
     * 
     * @param index positon in the underlying sequence to read
     * @returns nucleobase type at given index
     */
    public get(index: number): NucleobaseType {
        return this._get(Math.abs(Math.round(index)));
    }

    /**
     * @returns nucleobase type following the previously read one using this function
     */
    public abstract getNext(): NucleobaseType;

    protected abstract _get(index: number): NucleobaseType;
}
