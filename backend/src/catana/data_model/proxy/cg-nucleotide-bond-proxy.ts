import { Vector3 } from "three";
import CgNucleicAcidStrand from "../cg-nucleic-acid-strand";
import CgPolymer from "../cg-polymer";
import CgMonomerBondProxy from "./cg-monomer-bond-proxy";
import CgNucleotideProxy from "./cg-nucleotide-proxy";

/**
 * Nucleotide bond proxy class provides an abstracted view onto a bond between two nucleotides
 */
export class CgNucleotideBondProxy extends CgMonomerBondProxy {
    /**
     * @param parentPolymer parent strand of the starting nucleotide (or both nucleotides)
     * @param bondStartIndex index of starting nucleotide w.r.t parent polymer
     * @param bondEndIndex index of ending nucleotide w.r.t its parent polymer
     * @param bondEndPolymer parent polymer of ending nucleotide (if not set, parentPolymer is considered as parent)
     */
    constructor(parentPolymer: CgNucleicAcidStrand, bondStartIndex: number, bondEndIndex?: number, bondEndPolymer?: CgPolymer) {
        super(parentPolymer, bondStartIndex, bondEndIndex, bondEndPolymer);
    }

    /**
    * @returns Parent strand of starting nucleotide (or both nucleotides if bondEndStrand not set)
    */
    public get parentStrand(): CgNucleicAcidStrand {
        return this._bondStartPolymer as CgNucleicAcidStrand;
    }

    /**
    * @returns Parent strand of ending nucleotide if set, otherwise undefined.
    */
    public get bondEndStrand(): CgNucleicAcidStrand | undefined {
        return this._bondEndPolymer as CgNucleicAcidStrand;
    }

    /**
    * @returns Nucleotides involved in this bond (or null if corresponding nucleotide is not found)
    */
    public get nucleotides(): [CgNucleotideProxy | null, CgNucleotideProxy | null] {
        return [
            this.parentStrand.getNucleotideProxy(this.bondStartIndex),
            this.bondEndStrand ? this.bondEndStrand.getNucleotideProxy(this.bondEndIndex!) : null
        ];
    }

    /** @override */
    public get positions(): [Vector3, Vector3] {
        const nts = this.nucleotides;

        return [
            nts[0]?.backboneCenter ?? new Vector3(0, 0, 0),
            nts[1]?.backboneCenter ?? this.alternativeEndPosition ?? nts[0]?.backboneCenter ?? new Vector3(0, 0, 0)
        ];
    }
}

export default CgNucleotideBondProxy;