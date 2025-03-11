import Colormaker from "../../color/colormaker";
import { ColormakerRegistry } from "../../globals";
import CgMonomerBondProxy from "../data_model/proxy/cg-monomer-bond-proxy";
import CgMonomerProxy from "../data_model/proxy/cg-monomer-proxy";

/**
  * Uses colors stored as a property of coarse-grained polymers.
  * Useful mainly for cadnano-imported files.
  */
export class CgCustomColorMaker extends Colormaker {
    public monomerColor(m: CgMonomerProxy): number {
        return m.getParentPolymer().customColor?.getHex() ?? 0xFFFFFF;
    }

    public monomerBondColor(b: CgMonomerBondProxy): number {
        return b.bondStartPolymer.customColor?.getHex() ?? 0xFFFFFF;
    }
}

ColormakerRegistry.add("cg-custom", CgCustomColorMaker as any, []);

export default CgCustomColorMaker;
