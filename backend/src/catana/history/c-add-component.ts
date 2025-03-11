import Command from "./command";
import Stage from "../../stage/stage";
import Component from "../../component/component";

/**
 * This command keeps track of the added components,
 * its "do" therefore performs nothing and serves just for "undo"
 * purpose.
 */
export class AddComponentCommand extends Command {

    private _stage: Stage;
    private _components: Array<Component>;

    constructor(stage: Stage, components: Array<Component>) {
        super();
        this._stage = stage;

        this._components = components;
    }

    public do() { }

    public undo() {
        if (!this._components || this._components.length === 0) {
            this.error_cannotUndo();
            return;
        }
        for (let i = 0; i < this._components.length; ++i) {
            this._stage.removeComponent(this._components[i]);
        }
        this._components = new Array(0);
    }

    get name(): string {
        return "Added " + this._components.length + " component" + (this._components.length === 1 ? ": " : "s: ") + 
        this._components.map(x => x.name).join(", ");
    }
}

export default AddComponentCommand;