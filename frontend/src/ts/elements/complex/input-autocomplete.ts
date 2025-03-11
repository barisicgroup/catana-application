import Input from "../input";
import Panel, {PanelOrientation} from "../panel";
import Globals from "../../globals";
import {CallbackType} from "../element";
import TextElement from "../text-element";

export type OnOptionSelectedCallback = () => void;

type GetSuggestionsFunType = (text: string) => null | string[];
type ApplySuggestionFunType = (optionStr: string, fulltextStr: string) => string;

class InputAutocomplete extends Input {

    private options: TextElement[] = [];
    private strings: string[] = [];

    private readonly optionsPanel: Panel = new Panel(PanelOrientation.VERTICAL)
        .addClass("CustomSelectPanel");

    private activeOptionIndex: null | number = null;

    private optionSelectedCallbacks: OnOptionSelectedCallback[] = [];

    private readonly getSuggestionsFun: GetSuggestionsFunType;
    private readonly applySuggestionFun: ApplySuggestionFunType;

    private text: string;

    // getSuggestions(filterStr: string, component?: Component, maxSuggestions?: number): null | string[]
    // applySuggestion(suggestion: string, filterStr: string): string
    public constructor(value: string, getSuggestionsFun, applySuggestionFun) {
        super(value);
        const scope = this;

        this.getSuggestionsFun = getSuggestionsFun;
        this.applySuggestionFun = applySuggestionFun;
        this.text = this.getValue();

        this.addCallback(CallbackType.CLICK, () => scope.showOptions());
        this.addCallback(CallbackType.INPUT, () => scope.showOptions());
        this.addCallback(CallbackType.FOCUSOUT, () => scope.cancel());
        this.addCallback(CallbackType.FOCUSIN, () => scope.showOptions());

        this.addCallback(CallbackType.KEYDOWN, (type, src, event: KeyboardEvent) => {
            const code = (event.shiftKey ? "Shift" : "") + event.code;
            switch (code) {
                /*case "Space":
                case "Comma":
                    const t = scope.getValue(); // text
                    const c = code === "Space" ? " " : ",";

                    if (t.length > 0 && t.charAt(t.length - 1) !== c) {
                        scope.setValue(t + c);
                        scope.applySelectedOption();
                    }
                    break;*/
                case "Escape":
                    scope.cancel();
                    break;
                case "ArrowDown":
                case "ShiftArrowDown":
                case "Tab":
                    scope.downFun();
                    break;
                case "ArrowUp":
                case "ShiftArrowUp":
                case "ShiftTab":
                    scope.upFun();
                    break;
                default:
                    return;
            }
            event.preventDefault();
        });

        super.addOnEnterDownCallback(() => {
            if (scope.activeOptionIndex !== null) scope.applySelectedOption();
            Globals.tooltip?.deactivate();
        });

        Globals.tooltip?.add(this.optionsPanel);
    }

    public addOnOptionSelectedCallback(fun: OnOptionSelectedCallback) {
        this.optionSelectedCallbacks.push(fun);
        return this;
    }

    private selectOptionByIndex(i: number) {
        if (this.options.length === 0) return;
        const n = this.options.length;
        i = ((i % n) + n) % n; // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
        if (this.activeOptionIndex !== null) {
            this.options[this.activeOptionIndex].dom.classList.remove("active");
        }
        const option = this.options[i];
        option.dom.classList.add("active");
        this.activeOptionIndex = i;

        const suggestion = this.strings[i];
        const oldString = this.text;
        const newString = this.applySuggestionFun(suggestion, oldString);

        const maxCommonPartLenght = Math.min(oldString.length, newString.length);
        i = 0
        for (; i <= maxCommonPartLenght; ++i) {
            if (oldString.charAt(i) !== newString.charAt(i)) break;
        }
        const commonPartLength = i;

        this.setValue(newString);
        this.dom.setSelectionRange(commonPartLength, newString.length);
    }

    private cancel() {
        this.setValue(this.text);
        Globals.tooltip?.deactivate();
    }

    private upFun() {
        if (this.options.length === 0) return;
        const i = this.activeOptionIndex === null ? this.options.length - 1 : this.activeOptionIndex - 1;
        this.selectOptionByIndex(i);
    }

    private downFun() {
        if (this.options.length === 0) return;
        const i = this.activeOptionIndex === null ? 0 : this.activeOptionIndex + 1;
        this.selectOptionByIndex(i);
    }

    private showOptions() {
        this.text = this.getValue();
        const optionStrs = this.getSuggestionsFun(this.text); // list of strings
        this.optionsPanel.clear();
        this.options = [];
        this.strings = [];
        if (optionStrs && optionStrs.length > 0) {
            for (let oStr of optionStrs) {
                const o = new TextElement(oStr).addClass("Option");
                const i = this.options.length;
                this.options.push(o);
                this.strings.push(oStr);
                o.addCallback(CallbackType.MOUSEMOVE, () => {
                    this.selectOptionByIndex(i);
                });
                o.addCallback(CallbackType.MOUSELEAVE, () => {
                    if (this.activeOptionIndex === i) {
                        o.dom.classList.remove("active");
                        this.activeOptionIndex = null;
                    }
                });
                o.addCallback(CallbackType.MOUSEDOWN, () => {
                    this.applySelectedOption();
                });
                this.optionsPanel.add(o);
                this.activeOptionIndex = null;
            }
            const bb = this.dom.getBoundingClientRect(); // bounding box
            Globals.tooltip?.activate(this.optionsPanel, bb.left, bb.bottom);
        } else {
            Globals.tooltip?.deactivate();
        }
    }

    private applySelectedOption() {
        this.text = this.dom.value;
        const caretPos = this.text.length;
        this.dom.setSelectionRange(caretPos, caretPos);
        this.dom.blur();
        this.dom.focus();
        //UI.Globals.tooltip.deactivate();
        for (const c of this.optionSelectedCallbacks) c();
        this.showOptions();
    }
}

export default InputAutocomplete;