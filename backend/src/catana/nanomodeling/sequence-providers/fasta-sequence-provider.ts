import { NucleobaseType, oneLetterCodeToNucleobaseType } from "../../data_model/types_declarations/monomer-types";
import { NucleicAcidSequenceProvider } from "./nucleic-acid-sequence-provider";

/**
 * Nucleic acid sequence provider initialized with a FASTA sequence
 */
export class FastaSequenceProvider extends NucleicAcidSequenceProvider {
    private _ntTypesSequence: Array<NucleobaseType>;
    private _currIndex: number = 0;

    /**
     * @param fastaSequence sequence to be used by this provider
     */
    constructor(fastaSequence: string | NucleobaseType[]) {
        super();

        if (fastaSequence instanceof String) {
            this._ntTypesSequence = new Array<NucleobaseType>(fastaSequence.length);
            let i = 0;
            for (const c of fastaSequence) {
                this._ntTypesSequence[i++] = oneLetterCodeToNucleobaseType(c);
            }
        } else {
            this._ntTypesSequence = new Array<NucleobaseType>(...fastaSequence as NucleobaseType[]);
        }
    }

    /**
     * @returns length of the underlying FASTA sequence
     */
    public get length(): number {
        return this._ntTypesSequence.length;
    }

    /** @override */
    protected _get(index: number): NucleobaseType {
        return this._ntTypesSequence[index % this.length];
    }

    /** @override */
    public getNext(): NucleobaseType {
        return this._get(this._currIndex++);
    }
}
