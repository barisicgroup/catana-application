import Element from "./element";

class Radio extends Element<HTMLInputElement> {
    public constructor(value: string, isChecked: boolean = false, name?: string) { // TODO make 'value' a string?
        super(document.createElement("input"));
        this.dom.className = "Radio";
        this.dom.type = "radio";
        this.dom.checked = isChecked;
        this.dom.value = value;
        this.dom.name = name = name || Radio.getName();
        this.dom.id = Radio.getId();

        const group = Radio.groups[name] || (Radio.groups[name] = []);
        group.push(this);
    }

    public static groups: { [name: string]: Radio[] } = {};

    private static nextName: number = 0;
    private static getName(): string {
        return "" + (this.nextName++);
    }

    private static nextId: number = 0;
    private static getId(): string {
        return "" + (this.nextId++);
    }

    public createSibling(value: string, isChecked: boolean = false): Radio {
        return new Radio(value, isChecked, this.dom.name);
    }

    public getGroupValue(): string | null {
        for (const radio of Radio.groups[this.dom.name]) {
            if (radio.isChecked()) {
                return radio.getValue();
            }
        }
        return null;
    }

    public isChecked() {
        return this.dom.checked;
    }

    public setChecked(checked: boolean) {
        this.dom.checked = checked;
        return this;
    }

    public getValue(): string {
        return this.dom.value;
    }
}

export default Radio;