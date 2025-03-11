import { Stage, StageLoadFileParams } from "../../catana";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ExampleBase from "./example-base";
import CgStructureComponent from "../component/cg-structure-component";

class ExampleCgToAtom extends ExampleBase {
    public constructor(stage: Stage,
        readonly cadnanoPath: string = "catana://example_files/hextube.json") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            this.stage.loadFile(this.cadnanoPath, {
                defaultRepresentation: false,
                latticeType: "honeycomb",
            } as unknown as StageLoadFileParams).then(comps => {
                const struc = comps.find(x => x instanceof CgStructureComponent) as CgStructureComponent;
                if (struc) {
                    struc.autoView();
                    struc.addRepresentation("atomic", {});
                }
            });
        });
    }
}

export default ExampleCgToAtom;