import Stage, { StageLoadFileParams } from "../../stage/stage";
import { CatanaState } from "../actions/catana-state";
import CgStructureComponent from "../component/cg-structure-component";
import { NucleicAcidStrandEnd } from "../data_model/types_declarations/polymer-types";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import { duplicateComponentContainingStructure } from "../utils/catana-utils";
import ExampleBase from "./example-base";

class ExampleCgModifications extends ExampleBase {
    public constructor(stage: Stage, readonly filePath: string = "catana://example_files/rectangular_origami_sheet.json") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.filePath, {
                defaultRepresentation: true,
                latticeType: "square",
            } as unknown as StageLoadFileParams).then(comps => {
                const strucComp = comps.find(x => x instanceof CgStructureComponent) as CgStructureComponent;
                strucComp.setVisibility(false);
                strucComp.setName("original");
                
                if (strucComp) {
                    const newComp = duplicateComponentContainingStructure(this.stage, strucComp) as CgStructureComponent;
                    newComp.setName("modified");
                    newComp.removeAllRepresentations();

                    newComp.cgStructure.forEachNaStrand(str => {
                        if (str.name === "M" || str.name === "B") {
                            CatanaState.dnaFactory.extendHelix(str, NucleicAcidStrandEnd.THREE_PRIME, 16);
                        } else if (str.name === "H" || str.name === "D") {
                            CatanaState.dnaFactory.extendHelix(str, NucleicAcidStrandEnd.FIVE_PRIME, 16);
                        } else if (str.name === "K") {
                            str.breakAtNucleotide(str.getNucleotideProxy(str.length / 2)!);
                        }
                    });

                    newComp.addRepresentation("tube");
                    newComp.autoView();
                }
            });
        });
    }
}

export default ExampleCgModifications;