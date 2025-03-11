import Panel from "../panel";
import Radio from "../radio";
import Element, { Callback, CallbackType } from "../element";

class RadioGroupPanel extends Panel {

    private radios: Radio[];

    public constructor(options: string[], defaultSelectedId: number = 0) {
        super();
        this.addClass("RadioButtonGroupPanel");

        this.radios = [];

        if (options.length > 0) {
            this.radios.push(new Radio(options[0]));
        }
        for (let i = 1; i < options.length; ++i) {
            this.radios.push(this.radios[0].createSibling(options[i]));
        }

        if (defaultSelectedId >= 0 && defaultSelectedId < this.radios.length) {
            this.radios[defaultSelectedId].setChecked(true);
        }

        for (let i = 0; i < this.radios.length; ++i) {
            const label = new Element<HTMLLabelElement>(document.createElement("label")).addClass("Text");
            label.dom.textContent = options[i];
            label.dom.setAttribute("for", this.radios[i].dom.id);
            this.add(this.radios[i], label);
        }
    }

    public getRadio(index: number): Radio {
        return this.radios[index];
    }

    public findRadioByValue(value: string): null | Radio {
        for (const r of this.radios) {
            if (r.getValue() === value) {
                return r;
            }
        }
        return null;
    }

    public getValue(): string | null {
        for (const radio of this.radios) {
            if (radio.isChecked()) {
                return radio.getValue();
            }
        }
        return null;
    }

    public getSelectedIndex(): number | null {
        let i = 0;
        for (const radio of this.radios) {
            if (radio.isChecked()) {
                return i;
            }
            ++i;
        }

        return null;
    }

    public addCallback(types: CallbackType | CallbackType[], callback: Callback) {
        if (!Array.isArray(types)) types = [types];
        for (const radio of this.radios) {
            radio.addCallback(types, callback);
        }
        return this;
    }
}

export default RadioGroupPanel;