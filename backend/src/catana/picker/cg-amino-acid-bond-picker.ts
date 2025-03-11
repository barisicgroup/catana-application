import CgAminoAcidChain from "../data_model/cg-amino-acid-chain";
import CgAminoAcidBondProxy from "../data_model/proxy/cg-amino-acid-bond-proxy";
import CgMonomerBondPicker from "./cg-monomer-bond-picker";

export class CgAminoAcidBondPicker extends CgMonomerBondPicker {
    /** @override */
    public get type(): string {
        return "cg-amino-acid-bond";
    }

    /** @override */
    public getObject(pid: number): CgAminoAcidBondProxy {
        return new CgAminoAcidBondProxy(this.getParent(pid) as CgAminoAcidChain,
            this.getIndex(pid));
    }
}