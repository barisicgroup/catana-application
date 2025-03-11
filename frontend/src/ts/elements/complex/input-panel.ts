import Panel from "../panel";
import Element from "../element";
import TextElement from "../text-element";

class InputPanel<T extends Element<HTMLInputElement>> extends Panel {

    private readonly label: TextElement;
    private readonly input: T;

    public constructor(text: string = "", input: T) {
        super();
        this.dom.className = "InputPanel";

        this.label = new TextElement();
        this.input = input;
        this.add(this.label, this.input);

        this.setLabel(text);
    }

    public setLabel(label: string) {
        this.label.setText(label);
        return this;
    }

    public getInput(): T { // TODO look for all references of getInput() and fix mistakes...
        return this.input;
    }
}

export default InputPanel;