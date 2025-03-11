import Element from "./element";

class Slider extends Element<HTMLInputElement> {
    public constructor(min?: number, max?: number, value?: number, step?: number) {
        super(document.createElement("input"));

        this.addClass("Slider");
        this.dom.type = "range";

        this.setMin(min === undefined ? 0 : min);
        this.setMax(max === undefined ? 100000 : max);
        this.setStep(step === undefined ? 1000 : step);
        this.setValue(value === undefined ? 50000 : value);
    }

    public setMin(min: number) {
        this.dom.min = "" + min;
        return this;
    }

    public setMax(max: number) {
        this.dom.max = "" + max;
        return this;
    }

    public setValue(value: number) {
        this.dom.value = "" + value;
        return this;
    }

    public setStep(step: number) {
        this.dom.step = "" + step;
        return this;
    }

    public getMin(): number {
        return parseFloat(this.dom.min);
    }

    public getMax(): number {
        return parseFloat(this.dom.max);
    }

    public getValue(): number {
        return parseFloat(this.dom.value);
    }

    public getStep(): number {
        return parseFloat(this.dom.step);
    }

    public setValueNormalized(valueNormalized: number) {
        valueNormalized = Math.min(1, Math.max(0, valueNormalized));
        const range = this.getMax() - this.getMin();
        const value = (valueNormalized * range) + this.getMin();
        this.setValue(value);
        return this;
    }

    public getValueNormalized(): number {
        const range = this.getMax() - this.getMin();
        return range === 0 ? 0 : (this.getValue() - this.getMin()) / range;
    }
}

export default Slider;