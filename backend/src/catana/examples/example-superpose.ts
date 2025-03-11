import { Stage, StructureComponent, superpose } from "../../catana";
import ExampleBase from "./example-base";

class ExampleSuperpose extends ExampleBase {
    public constructor(stage: Stage, readonly targetPdbPath: string = "catana://example_files/3ugm.pdb",
        readonly superposedPdbPath: string = "catana://example_files/full_tal_moved.pdb") {
        super(stage);
    }

    public execute(): void {
        this.stage.loadFile(this.targetPdbPath, {
            defaultRepresentation: true
        }).then(targetComps => {
            this.stage.loadFile(this.superposedPdbPath, {
                defaultRepresentation: true
            }).then(superposedComps => {
                this.stage.autoView();
                superpose(
                    (superposedComps[0] as StructureComponent).structure,
                    (targetComps[0] as StructureComponent).structure,
                    true
                );
                (superposedComps[0] as StructureComponent).rebuildRepresentations();
            });
        });
    }
}

export default ExampleSuperpose;