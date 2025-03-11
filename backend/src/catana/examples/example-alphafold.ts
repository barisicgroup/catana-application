import { Stage } from "../../catana";
import ExampleBase from "./example-base";

class ExampleAlphaFold extends ExampleBase {
    public constructor(stage: Stage,
        readonly pdbPath: string = "catana://example_files/full_tal_no_dna.pdb") {
        super(stage);
    }

    public execute(): void {
        this.stage.loadFile(this.pdbPath, {
            defaultRepresentation: true
        }).then(comps => {
            comps[0].setName("tal");
            this.stage.autoView();
        });
    }
}

export default ExampleAlphaFold;