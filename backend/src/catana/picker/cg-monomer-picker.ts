import { Vector3 } from "three";
import CgMonomerProxy from "../data_model/proxy/cg-monomer-proxy";
import { CgPicker } from "./cg-picker";

export abstract class CgMonomerPicker extends CgPicker {
    /** @override */
    public abstract getObject(pid: number): CgMonomerProxy;

    /** @override */
    public _getPosition(pid: number): Vector3 {
        return this.getObject(pid).position;
    }
}