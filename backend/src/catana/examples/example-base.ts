import { Stage } from "../../catana";

abstract class ExampleBase {
    protected stage: Stage;

    public constructor(stage: Stage) {
        this.stage = stage;
    }

    public abstract execute(): void;
}

export default ExampleBase;