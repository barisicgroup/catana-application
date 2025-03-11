import PickingProxy from "../../controls/picking-proxy";
import Stage from "../../stage/stage";
import CatanaProteinActions from "./catana-protein-actions";
import { CatanaState } from "./catana-state";
import {Signal} from "signals";

/**
 * Keeps track of the current state of Catana (CatanaState) and receives the events (click_left, hover, etc...)
 *
 * Examples of states:
 * - move-state (translation of rotation of structures)
 * - cg-nucleic-acid-create-state (creation of a nucleic-acid strand, double- or single-stranded)
 * - ...
 *
 * The events are then forwarded to their respective methods of the current state
 * If there is no state (null), the respective signal (click_left, hover, etc...) is dispatched
 */
export class CatanaActions {
    public readonly catanaProteinActions: CatanaProteinActions = new CatanaProteinActions();

    // The current state of Catana (or null if Catana is in no specific state)
    private _state: CatanaState | null = null; // TODO rename

    public signals: {
        click_left: Signal,
        hover: Signal,
        down_left: Signal,
        drag_left: Signal,
        up_left: Signal,
        keyDown: Signal,

        stateChanged: Signal
    };

    public constructor() {
        this.signals = {
            click_left: new Signal(),
            hover: new Signal(),
            down_left: new Signal(),
            drag_left: new Signal(),
            up_left: new Signal(),
            keyDown: new Signal(),

            stateChanged: new Signal()
        };
    }

    /**
     * Does nothing if the new state 's' is the same as the current state 'this._state'
     * @param s The new state
     * @param silent If true, the stateChanged signal will not be dispatched
     */
    public setState(s: CatanaState | null, silent: boolean = false) {
        if (s === this._state) return;
        if (this._state) this._state.exit();
        this._state = s;
        if (s) s.enter();
        if (!silent) this.signals.stateChanged.dispatch();
    }

    public getState(): CatanaState | null {
        return this._state;
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public click_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._state) return this._state.click_left(stage, pickingProxy);
        this.signals.click_left.dispatch(pickingProxy);
        return false;
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public hover(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._state) return this._state.hover(stage, pickingProxy);
        this.signals.hover.dispatch(pickingProxy);
        return false;
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public down_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._state) return this._state.down_left(stage, pickingProxy);
        this.signals.down_left.dispatch(pickingProxy);
        return false;
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public up_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._state) return this._state.up_left(stage, pickingProxy);
        this.signals.up_left.dispatch(pickingProxy);
        return false;
    }

    /**
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public drag_left(stage: Stage, pickingProxy: PickingProxy): boolean {
        if (this._state) return this._state.drag_left(stage, pickingProxy);
        this.signals.drag_left.dispatch(pickingProxy);
        return false;
    }

    /**
     * @param stage The stage
     * @param key The value of the key pressed (see KeyboardEvent.key)
     * @returns true if further actions should be blocked; or false otherwise (action propagates)
     */
    public keyDown(stage: Stage, key: string): boolean {
        if (this._state) return this._state.keyDown(stage, key);
        this.signals.keyDown.dispatch(key);
        return false;
    }
}

export default CatanaActions;
