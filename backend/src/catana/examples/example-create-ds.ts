import Stage from "../../stage/stage";
import NucleicAcidStructuresProvider from "../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ScriptingApi from "../scripting/scripting-api";
import ExampleBase from "./example-base";

class ExampleCreateDs extends ExampleBase {
    public constructor(stage: Stage, readonly seq: string = "GATTACAACATTAG") {
        super(stage);
    }

    public execute(): void {
        NucleicAcidStructuresProvider.loadStructures().then(() => {
            ScriptingApi.createDsDna(this.seq);
        });
    }
}

export default ExampleCreateDs;