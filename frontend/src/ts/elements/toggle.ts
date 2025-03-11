import Button, {ButtonType} from "./button";
import {Callback, CallbackType} from "./element";

export enum ToggleState {
    ON, OFF
}

class Toggle extends Button {

    private readonly _onText: string;
    private readonly _offText: string;
    private readonly _changeCallbacks: Callback[];

    protected state: ToggleState;

    public constructor(state: ToggleState, onText: string, offText?: string, type: ButtonType = ButtonType.NORMAL) {
        super(state === ToggleState.ON ? onText : (offText || onText), type);
        this.addClass("Toggle");
        this._onText = onText;
        this._offText = offText || onText;
        this._changeCallbacks = [];
        this.setState(state);
        const scope = this;
        super.addCallback(CallbackType.CLICK, () => {
            scope.setState(this.isOn() ? ToggleState.OFF : ToggleState.ON)
        });
    }

    public addCallback(types: CallbackType | CallbackType[], fun: Callback): this {
        if (types === CallbackType.CHANGE) {
            this._changeCallbacks.push(fun);
            return this;
        } else if (Array.isArray(types)) {
            const index = types.indexOf(CallbackType.CHANGE);
            if (index !== -1) {
                types.splice(index, 1);
                this._changeCallbacks.push(fun);
            }
        }
        super.addCallback(types, fun);
        return this;
    }

    public setState(state: ToggleState, silent: boolean = false) {
        this.state = state;
        this.setText(this.isOn() ? this._onText : this._offText);
        if (this._changeCallbacks && !silent)
            for (const c of this._changeCallbacks)
                c(CallbackType.CHANGE, this);
        return this;
    }

    public isOn(): boolean {
        return this.state === ToggleState.ON;
    }
}

export default Toggle;