import { Stage } from "../../catana";
import ExampleBase from "./example-base";

class ExamplePdbLoad extends ExampleBase {
    public constructor(stage: Stage, readonly pdbName: string = "catana://example_files/6vz8.pdb") {
        super(stage);
    }

    public execute(): void {
        this.stage.loadFile(this.pdbName, {
            defaultRepresentation: true
        }).then(comps => {
            this.stage.autoView();
        });
    }
}

export default ExamplePdbLoad;