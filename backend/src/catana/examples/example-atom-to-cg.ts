import { MultiObjectsStorage, Stage, StructureComponent } from "../../catana";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ExampleBase from "./example-base";
import { convertAllAtomStructureToCoarseGrained } from "../nanomodeling/aa-to-cg-structure-conversion";

class ExampleAtomToCg extends ExampleBase {
    public constructor(stage: Stage,
        readonly pdbName: string = "catana://example_files/1w0u.pdb") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.pdbName, {
                defaultRepresentation: false
            }).then(comps => {
                if (comps.length > 0) {
                    const struc = (comps[0] as StructureComponent).structure;

                    const cgStruc = convertAllAtomStructureToCoarseGrained(struc);
                    const newComps = this.stage.addComponentFromObject(new MultiObjectsStorage([cgStruc]));

                    if (newComps.length > 0) {
                        this.stage.defaultFileRepresentation(newComps[0]);
                        newComps[0].autoView();
                        newComps[0].reprList.forEach(repr => {
                            if (repr.repr.type === "atomic") {
                                repr.setVisibility(false);
                            }
                        })
                    }

                    comps[0].setVisibility(false);
                }
            });
        });
    }
}

export default ExampleAtomToCg;