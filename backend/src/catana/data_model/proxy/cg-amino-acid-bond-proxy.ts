import { Vector3 } from "three";
import CgAminoAcidChain from "../cg-amino-acid-chain";
import CgPolymer from "../cg-polymer";
import CgAminoAcidProxy from "./cg-amino-acid-proxy";
import CgMonomerBondProxy from "./cg-monomer-bond-proxy";

/**
 * Amino acid bond proxy class provides an abstracted view onto a bond between two amino acids
 */
export class CgAminoAcidBondProxy extends CgMonomerBondProxy {
     /**
     * @param parentPolymer parent chain of the starting amino acid (or both amino acids)
     * @param bondStartIndex index of starting amino acid w.r.t parent polymer
     * @param bondEndIndex index of ending amino acid w.r.t its parent polymer
     * @param bondEndPolymer parent polymer of ending amino acid (if not set, parentPolymer is considered as parent)
     */
    constructor(parentPolymer: CgAminoAcidChain, bondStartIndex: number, bondEndIndex?: number, bondEndPolymer?: CgPolymer) {
        super(parentPolymer, bondStartIndex, bondEndIndex, bondEndPolymer);
    }

    /**
     * @returns Parent chain of starting amino acid (or both amino acids if bondEndChain not set)
     */
    public get parentChain(): CgAminoAcidChain {
        return this._bondStartPolymer as CgAminoAcidChain;
    }

    /**
     * @returns Parent chain of ending amino acid if set, otherwise undefined.
     */
    public get bondEndChain(): CgAminoAcidChain | undefined {
        return this._bondEndPolymer as CgAminoAcidChain;
    }

    /**
     * @returns Amino acids involved in this bond (or null if corresponding amino acid is not found)
     */
    public get aminoAcids(): [CgAminoAcidProxy | null, CgAminoAcidProxy | null] {
        return [
            this.parentChain.getAminoAcidProxy(this.bondStartIndex),
            this.bondEndChain ? this.bondEndChain.getAminoAcidProxy(this.bondEndIndex!) : null
        ];
    }

    /** @override */
    public get positions(): [Vector3, Vector3] {
        const aa = this.aminoAcids;

        return [
            aa[0]?.alphaCarbonLocation ?? new Vector3(0, 0, 0),
            aa[1]?.alphaCarbonLocation ?? this.alternativeEndPosition ?? aa[0]?.alphaCarbonLocation ?? new Vector3(0, 0, 0)
        ];
    }
}

export default CgAminoAcidBondProxy;