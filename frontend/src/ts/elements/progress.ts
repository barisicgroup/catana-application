import Element from "./element";

class Progress extends Element<HTMLProgressElement> {
    // Not providing 'val' will create indeterminate progress bar
    public constructor(max: number = 100, val?: number) {
        super(document.createElement("progress"));
        this.dom.className = "Progress";
        this.setMax(max);
        if (val !== undefined) this.setValue(val);
    }

    public getMax(): number {
        return this.dom.max;
    }

    public setMax(max: number) {
        this.dom.max = max;
        return this;
    }

    public getValue(): number {
        return this.dom.value;
    }

    public setValue(value: number) {
        this.dom.value = value;
        return this;
    }

    public show() {
        this.setVisible(true);
    }

    public hide() {
        this.setVisible(false);
    }
}

export default Progress;