import { NucleobaseType } from "../../data_model/types_declarations/monomer-types";
import { NucleicAcidSequenceProvider } from "./nucleic-acid-sequence-provider";

/**
 * Nucleic acid sequence provider generating random nucleobase type on each read
 */
export class RandomNaSequenceProvider extends NucleicAcidSequenceProvider {
    public allowedValues: NucleobaseType[];

    /**
     * @param allowedValues nucleobases included in the random generation
     */
    public constructor(allowedValues: NucleobaseType[] = [NucleobaseType.A, NucleobaseType.T, NucleobaseType.C, NucleobaseType.G]) {
        super();
        
        this.allowedValues = allowedValues;
    }

    /** @override */
    protected _get(index: number): NucleobaseType {
        return this.getNext();
    }

    /** @override */
    public getNext(): NucleobaseType {
        return this.allowedValues[Math.floor(Math.random() * this.allowedValues.length)];
    }
}
