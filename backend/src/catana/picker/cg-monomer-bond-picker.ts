import { Vector3 } from "three";
import CgMonomerBondProxy from "../data_model/proxy/cg-monomer-bond-proxy";
import { CgPicker } from "./cg-picker";

export abstract class CgMonomerBondPicker extends CgPicker {
    /** @override */
    public abstract getObject(pid: number): CgMonomerBondProxy;

    /** @override */
    public _getPosition(pid: number): Vector3 {
        return this.getObject(pid).position;
    }
}

export default CgMonomerBondPicker;