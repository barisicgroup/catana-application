import { hasOwnProperty, openLink } from "../util.js";

export enum CallbackType {
    CLICK, KEYDOWN,
    DROP, DRAGSTART, DRAGOVER, DRAGENTER, DRAGLEAVE,
    MOUSEENTER, MOUSELEAVE, MOUSEDOWN, MOUSEMOVE, MOUSEUP,
    INPUT, CHANGE,
    FOCUSIN, FOCUSOUT,
    FOCUS, BLUR,
    SUBMIT,
    PASTE,
    DBLCLICK, // Enum name now determines the event string name so this MUST be DBLCLICK, not DOUBLECLICK or something else
    // Custom
    VISIBILITYCHANGED
}

const CallbackTypeStrings: { [id: number]: string } = {};
for (let key_str in CallbackType) {
    const key = Number(key_str);
    if (!isNaN(key)) { // If key is a number
        key_str = CallbackType[key].toLowerCase();
        CallbackTypeStrings[key] = key_str;
    }
}

export type Callback = (type: CallbackType, srcElement: Element, event?: Event) => void;

class Element<E extends HTMLElement = HTMLElement> {

    public dom: E; // TODO make private, rename to "_dom", and provide a getter named "dom"
    private enabled: boolean;
    private disabledOverlay: null | Element = null;
    private callbacks: Set<Callback>;
    private visibilityChangedCallback: Set<Callback>;

    public constructor(dom: E) {
        this.dom = dom;
        this.enabled = true;
        this.callbacks = new Set();
        this.visibilityChangedCallback = new Set();
    }

    //public get dom(): E {
    //    return this._dom;
    //}

    public setId(id: string) {
        this.dom.id = id;
        return this;
    }

    public addClass(classname: string) {
        const names = classname.split(" ");
        for (const name of names) {
            if (name === "") continue;
            if (!this.dom.classList.contains(name)) this.dom.classList.add(name);
        }
        return this;
    }

    public removeClass(name: string): this {
        this.dom.classList.remove(name);
        return this;
    }

    public clear(): this {
        while (this.dom.firstChild) {
            this.dom.removeChild(this.dom.lastChild!);
        }
        return this;
    }

    public orphan(): this {
        this.dom.parentNode && this.dom.parentNode.removeChild(this.dom);
        return this;
    }

    public dispose(): this {
        this.orphan();
        return this;
    }

    public addCallback(types: CallbackType | CallbackType[], fun: Callback) {
        if (!Array.isArray(types)) types = [types];
        else if (types.length === 0) return this;
        let added = false;
        for (let type of types) {
            if (type === CallbackType.VISIBILITYCHANGED) {
                this.visibilityChangedCallback.add(fun);
                added = true;
            } else {
                switch (type) {
                    // TODO make enum for all of these
                    case CallbackType.CLICK:
                    case CallbackType.DBLCLICK:
                        if (!this.dom.classList.contains("clickable")) {
                            this.dom.classList.add("clickable");
                        }
                        break;
                    default:
                        // Do nothing
                        break;
                }

                this.dom.addEventListener(CallbackTypeStrings[type], (event) => {
                    fun(type, this, event)
                });
                added = true;
            }
        }
        if (added) this.callbacks.add(fun);
        return this;
    }

    protected static filterOutTypes(allTypes: CallbackType | CallbackType[],
        allowedTypes: CallbackType | CallbackType[],
        callback?: (type: CallbackType) => void): CallbackType[] {
        if (!Array.isArray(allTypes)) allTypes = [allTypes];
        if (!Array.isArray(allowedTypes)) allowedTypes = [allowedTypes];
        let i = allTypes.length;
        while (i--) {
            const t = allTypes[i];
            if (allowedTypes.includes(t)) {
                allTypes.splice(i, 1);
                if (callback) callback(t);
            }
        }
        return allTypes;
    }

    public removeCallback(fun: Callback) {
        this.callbacks.delete(fun);
        this.visibilityChangedCallback.delete(fun);
        return this;
    }

    public setVisible(visible: boolean) {
        if (visible) {
            this.dom.classList.remove("invisible");
        } else if (!this.dom.classList.contains("invisible")) {
            this.dom.classList.add("invisible");
        }
        this.visibilityChangedCallback.forEach(c => c(CallbackType.VISIBILITYCHANGED, this));
        return this;
    }

    public isVisible() {
        return !this.dom.classList.contains("invisible");
    }

    public appendBefore(element: Element<HTMLElement>) {
        this.dom.parentNode?.insertBefore(element.dom, this.dom);
        return this;
    }

    public appendAfter(element: Element<HTMLElement>) {
        if (!this.dom.nextSibling) this.dom.parentNode?.appendChild(element.dom);
        else this.dom.parentNode?.insertBefore(element.dom, this.dom.nextSibling);
        return this;
    }

    public setTitle(title: string) {
        this.dom.title = title;
        return this;
    }

    public getTitle(): string {
        return this.dom.title;
    }

    public setEnabled(enabled: boolean, disabledText?: string) {
        if (this.disabledOverlay) this.disabledOverlay.dispose();
        this.disabledOverlay = null;
        if (hasOwnProperty(this.dom, "disabled")) {
            this.dom.disabled = !enabled;
        }
        if (enabled !== this.enabled) {
            this.enabled = enabled;
            if (!enabled) {
                this.dom.classList.add("disabled");

                this.disabledOverlay = new Element<HTMLDivElement>(document.createElement("div"));
                if (disabledText) this.disabledOverlay.dom.textContent = disabledText;
                this.disabledOverlay.addClass("DisabledOverlay");
                this.dom.appendChild(this.disabledOverlay.dom)

            } else {
                this.dom.classList.remove("disabled");
            }
        }
        return this;
    }

    public setHighlighted(highlighted: boolean) {
        if (highlighted) this.addClass("highlighted");
        else this.removeClass("highlighted");
    }

    public scrollIntoView() {
        this.dom.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }

    public isEnabled() {
        return this.enabled;
    }

    public link(url: string, newTab: boolean = true) {
        this.addClass("Link");
        this.addCallback(CallbackType.CLICK, () => openLink(url, newTab));
        return this;
    }

    public select() {
        const sel = window.getSelection();
        if (!sel) {
            console.error("Could not select element because window.getSelection() returned 'undefined'");
            return;
        }
        const range = document.createRange();
        range.selectNodeContents(this.dom);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    public makeCopiable() {
        const scope = this;
        let callback: () => void;
        if (navigator.clipboard && hasOwnProperty(scope, "getValue")) { // TODO maybe there's a better way...
            const value = (scope.getValue as () => string)();
            callback = () => navigator.clipboard.writeText(value)
        } else {
            callback = () => scope.select();
        }
        this.addCallback(CallbackType.CLICK, callback);
        this.addClass("copiable");
        //this.dom.appendChild(new UI.IconText(UI.Constants.TEXT_CLIPBOARD)
        //    .addClass("CopiableClipboardIcon").dom);
        return this;
    }

    /*public getValue(): any { // TODO: string?
        return this.dom.textContent;
    }*/

    public getElementHTML(): string {
        return this.dom.outerHTML;
    }

    public getStyle(): CSSStyleDeclaration {
        return this.dom.style;
    }
}

export default Element;