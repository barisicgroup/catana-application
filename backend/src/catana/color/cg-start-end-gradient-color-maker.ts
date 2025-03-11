import Colormaker from "../../color/colormaker";
import { ColormakerRegistry } from "../../globals";
import CgMonomerBondProxy from "../data_model/proxy/cg-monomer-bond-proxy";
import CgMonomerProxy from "../data_model/proxy/cg-monomer-proxy";

/**
  * Color maker interpolating between two colors from start to end
  * resulting in a gradient visualizing the polymer direction.
  */
export class CgStartEndGradientColorMaker extends Colormaker {
    public monomerColor(m: CgMonomerProxy): number {
        return this.getColor(m.index, m.getParentPolymer().length);
    }

    public monomerBondColor(b: CgMonomerBondProxy): number {
        return this.getColor(b.bondStartIndex, b.bondStartPolymer.length);
    }

    private getColor(thisIdx: number, maxVal: number): number {
        return this.getScale()(thisIdx / maxVal);
    }
}

ColormakerRegistry.add("direction gradient", CgStartEndGradientColorMaker as any);

export default CgStartEndGradientColorMaker;
