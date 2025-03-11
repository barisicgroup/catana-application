import Colormaker from "../../color/colormaker";
import { ColormakerRegistry } from "../../globals";
import CgMonomerBondProxy from "../data_model/proxy/cg-monomer-bond-proxy";
import CgMonomerProxy from "../data_model/proxy/cg-monomer-proxy";
import CgNucleotideBondProxy from "../data_model/proxy/cg-nucleotide-bond-proxy";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";

/**
  * Higlights nucleotides which are taking part in a DNA origami crossover.
  * The computation of which nucleotides are in a crossover is approximate
  * and may yield incorrect results. However, it should provide a basic idea of the crossover ratio.
  */
export class CgCrossoverColorMaker extends Colormaker {
    public monomerColor(m: CgMonomerProxy): number {
        if (this.isInCrossover(m)) {
            return this.crossoverColor;
        }
        return this.defaultColor;
    }

    public monomerBondColor(b: CgMonomerBondProxy): number {
        if (b instanceof CgNucleotideBondProxy) {
            const nts = b.nucleotides;

            if (this.isInCrossover(nts[0]) || this.isInCrossover(nts[1])) {
                return this.crossoverColor;
            }
        }

        return this.defaultColor;
    }

    private get crossoverColor(): number {
        return this.getScale()(0.25);
    }

    private get defaultColor(): number {
        return this.getScale()(0.75);
    }

    private isInCrossover(m: CgMonomerProxy | null): boolean {
        if (!m || !(m instanceof CgNucleotideProxy)) {
            return false;
        }

        const prevNt = m.parentStrand.getNucleotideProxy(m.index - 1);
        const nextNt = m.parentStrand.getNucleotideProxy(m.index + 1);
        const bn = m.baseNormal;

        return (!!nextNt && bn.dot(nextNt.baseNormal) < 0) ||
            (!!prevNt && bn.dot(prevNt.baseNormal) < 0);
    }
}

ColormakerRegistry.add("crossover", CgCrossoverColorMaker as any);

export default CgCrossoverColorMaker;
