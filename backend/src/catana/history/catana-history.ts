import Command from "./command";
import {Signal} from "signals";

type HistorySignals = {
    commandDone: Signal
}

/**
 * Class for managing the undo-redo functionality.
 * 
 * @experimental
 */
export class CatanaHistory {

    private _signals: HistorySignals;
    private _last: Command | null = null;

    constructor() {
        this._signals = {
            commandDone: new Signal()
        }
    }

    public get signals(): HistorySignals {
        return this._signals;
    }

    public get last(): Command | null {
        return this._last;
    }

    public do(c: Command) {
        c.do();
        c.prev = this._last;
        this._last = c;
        this._signals.commandDone.dispatch(c);
    }

    public undo() {
        if (this._last) {
            this._last.undo();
            this._last = this._last.prev;
        }
    }

    public forEachCommand(callback: (command: Command) => void) {
        let c: Command | null = this._last;
        while (c) {
            callback(c);
            c = c.prev;
        }
    }
}

export default CatanaHistory;