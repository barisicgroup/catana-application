import Dialog from "./dialog";
import Form from "../form";
import Select from "../select";
import Checkbox from "../checkbox";
import TextElement from "../text-element";

interface SelectParameter {
    name: string;
    type: "select";
    options: { [key: string]: string };
}

interface SliderParameter {
    name: string;
    type: "range";
    min: number;
    max: number;
    step: number;
    value: number;
}

interface CheckboxParameter {
    name: string;
    type: "checkbox";
    isChecked: boolean;
}

type Field = Select | Checkbox;

type Parameter = SelectParameter | SliderParameter | CheckboxParameter;

class FormDialog extends Dialog {

    private fields: { [key: string]: Field };

    // TODO parameters type
    public constructor(title: string, confirmText: string, parameters: Parameter[]) {
        super(title, confirmText);

        // Here, 'parameters' is an object (dict) where each entry represents a field in a form
        // Each value holds the data necessary to build a field
        // Each value is an object (dict) with:
        // - a 'name' string: the display-ready name of the field
        // - a 'type' field: compatible with the 'type' parameter of a HTML 'input'
        // - extra data to control the behavior of the 'input' field, such as:
        //   - 'options' (for the type 'select'), which consists of an object (dict),
        //     where the keys are the 'values' of the options, and the values are the 'names' of the options
        //   - 'step', 'min', 'max' for the type 'range'
        //   - etc...
        const form = new Form();
        this.fields = {};
        for (const pKey in parameters) {
            const p = parameters[pKey];
            let input;
            switch (p.type) {
                case "select":
                    input = new Select(p.options);
                    break;
                case "checkbox":
                    input = new Checkbox(p.isChecked);
                    break;
                default:
                    console.error("Unsupported Dialog form type: " + p.type);
                    continue;
            }
            form.add(p.name, input);
            form.dom.appendChild(new TextElement().p().dom);
            this.fields[pKey] = input;
        }
        this.add(form);
    }

    public getParameters() {
        const p = {};
        for (const pKey in this.fields) {
            const fpk = this.fields[pKey];
            if (fpk instanceof Checkbox) {
                p[pKey] = fpk.isChecked();
            } else {
                p[pKey] = fpk.getValue();
            }
        }
        return p;
    }
}

export default FormDialog;