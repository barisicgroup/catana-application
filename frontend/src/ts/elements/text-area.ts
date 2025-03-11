import Element, {CallbackType} from "./element";

class TextArea extends Element<HTMLTextAreaElement> {
    public constructor(text: string = "", editable: boolean = true) {
        super(document.createElement("textarea"));
        this.addClass("TextArea");
        this.addCallback(CallbackType.KEYDOWN, (type, src, event: KeyboardEvent) => {
            event.stopPropagation();
        });
        this.setValue(text);
        this.setEditable(editable);
        return this;
    }

    public getValue() {
        return this.dom.value;
    }

    public setValue(value: string) {
        this.dom.value = value;
        return this;
    }

    public setText(text: string) {
        this.setValue(text);
        return this;
    }

    public addValue(value: string) {
        this.dom.value = this.getValue() + value;
        return this;
    }

    public addRow(value : string) {
        this.addValue(value + "\n");
    }

    public setEditable(editable: boolean) {
        if (editable) {
            this.dom.removeAttribute("readonly");
            this.addClass("editable");
        } else {
            this.dom.setAttribute("readonly", "readonly");
            this.removeClass("editable");
        }
        return this;
    }

    public setResizable(resize: "none" | "vertical" | "horizontal" | "both"): this {
        this.removeClass("Resizable");
        this.removeClass("Vertical");
        this.removeClass("Horizontal");
        if (resize !== "none") {
            this.addClass("Resizable");
            if (resize === "both" || resize === "vertical") this.addClass("Vertical");
            if (resize === "both" || resize === "horizontal") this.addClass("Horizontal");
        }
        return this;
    }
}

export default TextArea;