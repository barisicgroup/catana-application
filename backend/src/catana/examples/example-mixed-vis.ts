import Stage, { StageLoadFileParams } from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ExampleBase from "./example-base";

class ExampleMixedVis extends ExampleBase {
    public constructor(stage: Stage,
        readonly pdbName: string = "catana://example_files/1w0u.pdb", readonly cadnanoPath: string = "catana://example_files/hextube.json") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.pdbName, {
                defaultRepresentation: false
            }).then(comps => {
                comps[0].addRepresentation("tube", {});
                comps[0].reprList[0].setFilter("PROTEIN and :A");


                comps[0].addRepresentation("cartoon", {});
                comps[0].reprList[1].setFilter("DNA");
                comps[0].reprList[1].setColor("resname");

                comps[0].addRepresentation("rocket", {});
                comps[0].reprList[2].setFilter("PROTEIN and :A");

                comps[0].setPosition([117, 193, -47]);
            }).then(() => {
                this.stage.loadFile(this.cadnanoPath, {
                    defaultRepresentation: true,
                    latticeType: "honeycomb",
                } as unknown as StageLoadFileParams).then(comps => {
                    const struc = comps.find(x => x instanceof CgStructureComponent) as CgStructureComponent;
                    if (struc) {
                        struc.autoView();

                        struc.reprList[0].setFilter("STAPLE and :C");
                        struc.reprList[0].setColor("cg-custom");

                        struc.addRepresentation("tube", {});
                        struc.reprList[1].setFilter("SCAFFOLD");
                        struc.reprList[1].setColor("crossover");
                    }
                });
            }
            );
        });
    }
}

export default ExampleMixedVis;