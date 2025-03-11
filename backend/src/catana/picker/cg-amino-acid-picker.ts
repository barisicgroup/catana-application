import CgAminoAcidChain from "../data_model/cg-amino-acid-chain";
import CgAminoAcidProxy from "../data_model/proxy/cg-amino-acid-proxy";
import { CgMonomerPicker } from "./cg-monomer-picker";

export class CgAminoAcidPicker extends CgMonomerPicker {
    /** @override */
    public get type(): string {
        return "cg-amino-acid";
    }

    /** @override */
    public getObject(pid: number): CgAminoAcidProxy {
        return (this.getParent(pid) as CgAminoAcidChain).getAminoAcidProxy(this.getIndex(pid))!;
    }
}