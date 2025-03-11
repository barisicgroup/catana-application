import Element from "./element";

class EditableElement<E extends HTMLElement> extends Element<E> {
    public constructor(dom: E, text?: string, editable: boolean = true) {
        super(dom);
        this.dom.className = "EditableElement";
        this.setEditable(editable);
        if (text) this.setValue(text);
    }

    public setEditable(editable: boolean) {
        this.dom.contentEditable = "" + editable;
    }

    public setValue(value: string) {
        this.dom.textContent = value;
    }

    public getValue(): string {
        return this.dom.textContent || "";
    }

    public getLength(): number {
        return this.dom.textContent?.length || 0;
    }

    public setCaretPosition(position: number) {
        if (this.getLength() === 0) return;

        const range = document.createRange();
        const sel = window.getSelection();

        if (!sel) {
            console.error("Could not setCaretPosition because window.getSelection() returned 'undefined'");
            return this;
        }

        range.setStart(this.dom.firstChild || this.dom, position);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
        return this;
    }

    public getCaretPosition(): number {
        if (this.dom.childNodes.length === 0) return 0;
        const sel = window.getSelection();
        if (!sel) {
            console.error("Could not get caret position because window.getSelection() returned 'undefined'");
        } else if (sel.rangeCount === 1) {
            const range = sel.getRangeAt(0);
            if (range.startContainer.parentNode === range.endContainer.parentNode &&
                range.startContainer.parentNode === this.dom) {
                return range.endOffset;
            }
        }
        return -1;
    }

    public focus() {
        this.dom.focus();
        this.setCaretPosition(this.getLength());
    }
}

export default EditableElement;