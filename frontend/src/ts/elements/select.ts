import Element from "./element";

export type Options = readonly string[] | { [id: string]: string | { value: string, text: string } };

class Select extends Element<HTMLSelectElement> {
    public constructor(options?: Options, allowMultiple: boolean = false) {
        super(document.createElement("select"));
        this.dom.className = "Select";
        if (allowMultiple) this.dom.setAttribute("multiple", "");
        if (options) this.addOptions(options);
    }

    public setValue(value: string) {
        this.dom.value = value;
        return this;
    }

    public getValue(): string {
        return this.dom.value;
    }

    public setSelectedIndex(index: number) {
        this.dom.selectedIndex = index;
        return this;
    }

    public setAllSelected(): this {
        for (const o of this.dom.options) o.selected = true;
        return this;
    }

    public getSelectedIndex(): number {
        return this.dom.selectedIndex;
    }

    public getSelectedOptions(): HTMLCollectionOf<HTMLOptionElement> {
        return this.dom.selectedOptions;
    }

    public removeOptions() {
        this.dom.querySelectorAll("option").forEach(n => n.remove());
        return this;
    }

    public addOptions(options: Options, addOnlyIfUnique: boolean = false) {
        let currOptions = this.dom.options;
        let existingValues: string[] = [];

        if (addOnlyIfUnique) {
            for (let i = 0; i < currOptions.length; ++i) {
                existingValues.push(currOptions[i].value);
            }
        }

        if (Array.isArray(options)) {
            for (let o of options) {
                if (!addOnlyIfUnique || existingValues.indexOf(o) === -1) {
                    const option = Select.createOption();
                    option.dom.className = "Option";
                    option.dom.value = o;
                    option.dom.text = o;
                    this.dom.appendChild(option.dom);
                }
            }
        } else {
            for (const key of Object.keys(options)) {
                const value = options[key];
                let v: { value: string, text: string };
                if (typeof value === "string") {
                    v = { value: key, text: value as string };
                } else {
                    v = value;
                }
                if (!addOnlyIfUnique || existingValues.indexOf(v.value) === -1) {
                    const option = Select.createOption();
                    option.dom.value = v.value;
                    option.dom.text = v.text;
                    this.dom.appendChild(option.dom);
                }
            }
        }
    }

    public updateOptions(newOptions: Options) {
        this.removeOptions();
        this.addOptions(newOptions);
    }

    private static createOption(): Element<HTMLOptionElement> {
        return new Element<HTMLOptionElement>(document.createElement("option")).addClass("Option");
    }
}

export default Select;