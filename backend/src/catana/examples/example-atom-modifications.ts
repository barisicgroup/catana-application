import Stage from "../../stage/stage";
import ExampleBase from "./example-base";

class ExampleAtomModifications extends ExampleBase {
    public constructor(stage: Stage, readonly srcPdbPath: string = "catana://example_files/3few.pdb",
        readonly modifiedPdbPath: string = "catana://example_files/3few_modified.pdb") {
        super(stage);
    }

    public execute(): void {
        this.stage.loadFile(this.srcPdbPath, {
            defaultRepresentation: true
        }).then(comps => {
            comps[0].setPosition([-100, 0, 0]);
            comps[0].updateRepresentationMatrices();
        }).then(() => {
            this.stage.loadFile(this.modifiedPdbPath, {
                defaultRepresentation: true
            }).then(comps => {
                this.stage.autoView();
                
                comps[0].eachRepresentation(repr => {
                    if (repr.repr.type === "ball+stick") {
                        repr.setFilter("461 500-505");
                    }
                });
            })
        });
    }
}

export default ExampleAtomModifications;