import PickingProxy from "../../controls/picking-proxy";
import DnaFactory from "../nanomodeling/dna-factory";
import Stage from "../../stage/stage";
import ProteinFactory from "../nanomodeling/protein-factory";

/**
 * Abstract class describing a state of Catana
 */
export abstract class CatanaState {
    public static readonly dnaFactory: DnaFactory = new DnaFactory();
    public static readonly proteinFactory: ProteinFactory = new ProteinFactory();
    protected static readonly WHAT = {};

    /**
     * Forwards a click_left event to the subclass, and returns its result
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public click_left(stage: Stage, pickingProxy?: PickingProxy) {
        return this._click_left(stage, pickingProxy);
    };

    /**
     * Forwards a hover event to the subclass, and returns its result
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public hover(stage: Stage, pickingProxy?: PickingProxy) {
        return this._hover(stage, pickingProxy);
    };

    /**
     * Forwards a down_left event to the subclass, and returns its result
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public down_left(stage: Stage, pickingProxy?: PickingProxy) {
        return this._down_left(stage, pickingProxy);
    };

    /**
     * Forwards a up_left event to the subclass, and returns its result
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public up_left(stage: Stage, pickingProxy?: PickingProxy) {
        return this._up_left(stage, pickingProxy);
    };

    /**
     * Forwards a drag_left event to the subclass, and returns its result
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public drag_left(stage: Stage, pickingProxy?: PickingProxy) {
        return this._drag_left(stage, pickingProxy);
    };

    /**
     * @returns
     *      True if 'key' is "Shift"
     *      Otherwise,the keyDown is forwarded to the subclass, and its result is returned
     *      True is then returned if further actions should be blocked. False is returned otherwise (action propagates)
     */
    public keyDown(stage: Stage, key: string) {
        return key === "Shift" || this._keyDown(stage, key);
    };

    /**
     * Called when this state is entered. Forwarded to the subclass
     */
    public enter() {
        return this._enter();
    };

    /**
     * Called when this state is exited. Forwarded to the subclass
     */
    public exit() {
        return this._exit();
    };

    /**
     * @returns The description of this state. This information is retrieved from the subclass
     *         May return an empty string if the subclass provides no description
     */
    public description(): string {
        const separator = " | ";
        let d = "";
        for (const [action, description] of this._descriptions()) {
            if (action !== "") d += action + ": ";
            d += description + separator;
        }
        return d.substring(0, d.length - separator.length);
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    protected abstract _click_left(stage: Stage, pickingProxy?: PickingProxy): boolean;
    protected abstract _hover(stage: Stage, pickingProxy?: PickingProxy): boolean;
    protected abstract _down_left(stage: Stage, pickingProxy?: PickingProxy): boolean;
    protected abstract _up_left(stage: Stage, pickingProxy?: PickingProxy): boolean;
    protected abstract _drag_left(stage: Stage, pickingProxy?: PickingProxy): boolean;
    protected abstract _keyDown(stage: Stage, key: string): boolean;
    protected abstract _enter(): void;
    protected abstract _exit(): void;
    protected abstract _descriptions(): [string, string][];

    /**
     * Signals to CatanaActions (see catana-actions.ts) that this state should be exited
     * This is particularly useful for changes in UI elements that are related to a CatanaState
     * @returns False if SHIFT is currently being pressed
     *          True otherwise (state was exited)
     */
    protected done(stage: Stage): boolean {
        if (stage.mouseObserver.shiftKey) return false;
        stage.catanaActions.setState(null);
        return true;
    }
}
