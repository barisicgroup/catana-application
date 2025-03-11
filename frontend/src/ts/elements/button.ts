import Element from "./element";

export enum ButtonType {
    NORMAL=1, MINI=2
}

class Button extends Element<HTMLSpanElement> {

    private _selected: boolean;

    public constructor(text?: string, type: ButtonType = ButtonType.NORMAL) {
        super(document.createElement("span"));
        this.dom.className = Button.className;
        this.setSelected(false);
        this.setText(text);
        this.setType(type);
    }

    public setText(text?: string) {
        this.dom.textContent = text || "";
        return this;
    }

    public setType(type: ButtonType) {
        switch (type) {
            case ButtonType.MINI:
                this.addClass("Mini");
                break;
            default:
                console.warn("Unknown type for Button (type=" + type + "). Using 'normal' instead");
                // Fallthrough
            case ButtonType.NORMAL:
                this.removeClass("Mini");
                break;
        }
    }

    public setSelected(selected: boolean) {
        this.dom.classList.remove("selected");
        this.dom.classList.remove("unselected");
        if (selected) {
            this.dom.classList.add("selected");
        } else {
            this.dom.classList.add("unselected");
        }
        this._selected = selected;
        return this;
    }

    public getText(): string {
        return this.dom.textContent || "";
    }

    public isSelected(): boolean {
        return this._selected;
    }

    public static get className(): string {
        return "Button";
    }
}

export default Button;