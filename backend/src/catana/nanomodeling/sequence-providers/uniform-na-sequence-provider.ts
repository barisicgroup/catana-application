import { NucleobaseType } from "../../data_model/types_declarations/monomer-types";
import { NucleicAcidSequenceProvider } from "./nucleic-acid-sequence-provider";

/**
 * Nucleic acid sequence provider generating sequence of a single pre-defined nucleobase type
 */
export class UniformNaSequenceProvider extends NucleicAcidSequenceProvider {
    public type: NucleobaseType;

    /**
     * @param type nucleobase type to be generated
     */
    constructor(type: NucleobaseType) {
        super();
        this.type = type;
    }

    /** @override */
    protected _get(index: number): NucleobaseType {
        return this.getNext();
    }

    /** @override */
    public getNext(): NucleobaseType {
        return this.type;
    }
}
