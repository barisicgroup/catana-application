import { StructureComponent } from "../../catana";
import { degToRad } from "../../math/math-utils";
import Stage, { StageLoadFileParams } from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import { duplicateComponentContainingStructure } from "../utils/catana-utils";
import ExampleBase from "./example-base";

class ExampleStructureAssembly extends ExampleBase {
    public constructor(stage: Stage, readonly pdbPath: string = "catana://example_files/1ppb_dna.pdb",
        readonly cadnanoPath: string = "catana://example_files/rectangular_origami_sheet.json") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.cadnanoPath, {
                defaultRepresentation: false,
                latticeType: "square",
            } as unknown as StageLoadFileParams).then(comps => {
                const struc = comps.find(x => x instanceof CgStructureComponent);
                if (struc) {
                    struc.addRepresentation("tube", {});
                    struc.autoView();
                }
            }).then(() => {
                this.stage.loadFile(this.pdbPath, {
                    defaultRepresentation: true
                }).then(comps => {
                    if (comps.length > 0) {
                        let pdbComps = [comps[0] as StructureComponent];

                        for (let i = 0; i < 3; ++i) {
                            pdbComps.push(duplicateComponentContainingStructure(this.stage, pdbComps[0]) as StructureComponent);
                        }

                        let positions: [number, number, number][] = [
                            [2, 30, -8],
                            [120, 30, -8],
                            [2, 30, -200],
                            [120, 30, -200]
                        ]

                        pdbComps.forEach((c, idx) => {
                            c.setPosition(positions[idx]);
                            c.setRotation(([degToRad(41), degToRad(62), degToRad(-28)]));
                            c.updateRepresentationMatrices();
                        });

                    }
                });
            })
        });
    }
}

export default ExampleStructureAssembly;