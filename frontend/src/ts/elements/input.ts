import Element, {CallbackType} from "./element";

export type OnEnterDownCallback = () => void;

class Input extends Element<HTMLInputElement> {

    private enterDownCallbacks: OnEnterDownCallback[] = [];

    public constructor(value: string = "", type?: string, placeholder: string = "") {
        super(document.createElement("input"));

        if (type !== undefined) {
            this.dom.setAttribute("type", type);
        }

        const scope = this;
        this.dom.className = "Input editable";
        this.addCallback(CallbackType.KEYDOWN, (types, src, e: KeyboardEvent) => {
            if (e.key === "Enter") {
                for (const c of scope.enterDownCallbacks) c();
            }
            e.stopPropagation();
        });

        this.addCallback(CallbackType.DROP, (type, src, e: DragEvent) => {
            e.preventDefault();
            const data = e.dataTransfer?.getData("text");
            if (!data) {
                console.error("Data could not be dropped because dataTransfer was undefined.")
                return;
            }
            let value = scope.getValue();
            if (value.length > 0 && value.charAt(value.length - 1) !== " ") value += " ";
            scope.setValue(value + data);
        });

        this.addCallback(CallbackType.DRAGOVER, (type, src, e: DragEvent) => {
            e.preventDefault();
        });

        if (placeholder && placeholder.length > 0) {
            this.dom.placeholder = placeholder;
        }
        this.setValue(value);
    }

    public addOnEnterDownCallback(fun: OnEnterDownCallback) {
        this.enterDownCallbacks.push(fun);
        return this;
    }

    public getValue(): string {
        return this.dom.value;
    }

    public setValue(value: string) {
        this.dom.value = value;
        return this;
    }

    public setPlaceholder(placeholder: string) {
        this.dom.placeholder = placeholder;
        return this;
    }

    public setEnabled(enabled: boolean) {
        this.dom.toggleAttribute("readonly", !enabled);
        if (enabled) this.addClass("editable");
        else this.removeClass("editable");
        return super.setEnabled(enabled);
    }
}

export default Input;