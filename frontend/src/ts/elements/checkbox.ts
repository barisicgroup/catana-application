import Element from "./element";

class Checkbox extends Element<HTMLInputElement> {
    public constructor(isChecked: boolean = false) {
        super(document.createElement("input"));
        this.addClass("Checkbox");
        this.dom.type = "checkbox";
        this.dom.checked = isChecked;
    }

    public isChecked() {
        return this.dom.checked;
    }

    public setChecked(checked: boolean) {
        this.dom.checked = checked;
        return this;
    }
}

export default Checkbox;