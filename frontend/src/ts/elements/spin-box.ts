import Element from "./element";

class SpinBox extends Element<HTMLInputElement> {

    public constructor(value: number = 0, min?: number, max?: number, step?: number,) {
        super(document.createElement("input"));
        this.dom.type = "number";
        this.addClass("Input Number editable");

        this.setMin(min === undefined ? 0 : min);
        this.setMax(max === undefined ? 100000 : max);
        this.setStep(step === undefined ? 1 : step);
        this.setValue(value);
    }

    public setMin(min: number) {
        this.dom.min = "" + min;
        return this;
    }

    public getMin(): number {
        return parseFloat(this.dom.min);
    }

    public setMax(max: number) {
        this.dom.max = "" + max;
        return this;
    }

    public getMax(): number {
        return parseFloat(this.dom.max);
    }

    public setStep(step: number) {
        this.dom.step = "" + step;
        return this;
    }

    public getStep(): number {
        return parseFloat(this.dom.step);
    }

    public setValue(value: number) {
        this.dom.value = "" + value;
        return this;
    }

    public getValue(): number {
        return parseFloat(this.dom.value);
    }

    public isEmpty(): boolean {
        return this.dom.value.trim().length === 0;
    }

    public setEnabled(enabled: boolean, disabledText?: string) {
        super.setEnabled(enabled, disabledText);
        // TODO Hotfix, this.dom.disabled does not seem to work
        if (enabled) {
            this.dom.removeAttribute("disabled");
            this.dom.removeAttribute("editable");
        } else {
            this.dom.setAttribute("disabled", "");
            this.dom.setAttribute("editable", "");
        }
        return this;
    }
}

export default SpinBox;