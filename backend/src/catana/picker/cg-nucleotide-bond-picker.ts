import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideBondProxy from "../data_model/proxy/cg-nucleotide-bond-proxy";
import CgMonomerBondPicker from "./cg-monomer-bond-picker";

export class CgNucleotideBondPicker extends CgMonomerBondPicker {
    /** @override */
    public get type(): string {
        return "cg-nucleotide-bond";
    }

    /** @override */
    public getObject(pid: number): CgNucleotideBondProxy {
        return new CgNucleotideBondProxy(this.getParent(pid) as CgNucleicAcidStrand,
            this.getIndex(pid));
    }
}