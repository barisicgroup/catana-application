import Element from "./element";

class ColorPicker extends Element<HTMLInputElement> {
    public constructor(defaultColor: string = "#000000") {
        super(document.createElement("input"));
        this.dom.className = "Color";
        this.dom.type = "color";
        this.setValue(defaultColor);
    }

    public setValue(value: string) {
        this.dom.value = value;
    }

    public getValue(): string {
        return this.dom.value;
    }
}

export default ColorPicker;