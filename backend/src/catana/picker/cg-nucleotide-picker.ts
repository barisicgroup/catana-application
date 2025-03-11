import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import { CgMonomerPicker } from "./cg-monomer-picker";

export class CgNucleotidePicker extends CgMonomerPicker {
    /** @override */
    public get type(): string {
        return "cg-nucleotide";
    }

    /** @override */
    public getObject(pid: number): CgNucleotideProxy {
        return (this.getParent(pid) as CgNucleicAcidStrand).getNucleotideProxy(this.getIndex(pid))!;
    }

}