import Stage, { StageLoadFileParams } from "../../stage/stage";
import CgStructureComponent from "../component/cg-structure-component";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ExampleBase from "./example-base";

class ExampleCadnanoLoad extends ExampleBase {
    public constructor(stage: Stage, readonly filePath: string = "catana://example_files/hextube.json") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.filePath, {
                defaultRepresentation: true,
                latticeType: "honeycomb",
            } as unknown as StageLoadFileParams).then(comps => {
                const struc = comps.find(x => x instanceof CgStructureComponent);
                if (struc) {
                    struc.autoView();
                }
            });
        });
    }
}

export default ExampleCadnanoLoad;