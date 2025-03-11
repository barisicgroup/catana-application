import Element, {CallbackType} from "./element";

class Form extends Element<HTMLFormElement> {
    public constructor() {
        super(document.createElement("form"));
        this.dom.className = "Form";
        this.addCallback(CallbackType.SUBMIT, (types, src, e) => e?.preventDefault());
    }

    public add(labelText: string, element: Element<any>) {
        const label = new Element<HTMLLabelElement>(document.createElement("label"));
        label.dom.textContent = labelText;
        label.dom.className = "FormLabel";
        this.dom.appendChild(label.dom);
        this.dom.appendChild(element.dom);
    }
}

export default Form;