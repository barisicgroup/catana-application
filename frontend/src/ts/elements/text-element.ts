import Element from "./element";

export enum TextType {
    NORMAL=1, TITLE=2
}

export type TextPart =
    ["br" | "p"] |
    ["t" | "i" | "b" | "bi", string] |
    ["h", string, string] | ["h", string, string, boolean] |
    ["e", Element];

class TextElement extends Element<HTMLSpanElement> {

    private text: string = "";

    public constructor(text?: string, type: TextType = TextType.NORMAL) {
        super(document.createElement("span"));
        this.dom.className = "Text";
        if (text) this.t(text);
        switch (type) {
            case TextType.TITLE:
                this.addClass("Title");
                break;
            default:
                console.error("Unknown TextElement type: " + type);
                // Fallthrough
            case TextType.NORMAL:
                // Do nothing
                break;
        }
    }

    public setText(text: string | TextPart[]) {
        this.clear();
        if (typeof text === "string") {
            this.t(text);
        } else {
            for (const p of text) {
                switch (p[0]) {
                    case "br": this.br(); break;
                    case "p": this.p(); break;
                    case "t": this.t(p[1]); break;
                    case "i": this.i(p[1]); break;
                    case "b": this.b(p[1]); break;
                    case "bi": this.bi(p[1]); break;
                    case "h": this.h(p[1], p[2], p.length === 4 ? p[3] : undefined); break;
                    case "e": this.e(p[1]); break;
                    default:
                        console.error({ "": "Unexpected value at setText for text-element", value: p });
                        break;
                }
            }
        }
        return this;
    }

    public getText(): string {
        return this.text;
    }

    public getValue(): any {
        return this.dom.textContent;
    }

    private _addText(text: string) {
        this.text += (this.text.length === 0 ? "" : " ") + text;
    }

    public clear(): this {
        super.clear();
        this.text = "";
        return this;
    }

    /**
     * Adds some normal text to this text
     */
    public t(text: string) {
        this.dom.insertAdjacentText("beforeend", text);
        this._addText(text);
        return this;
    }

    /**
     * Adds some bold text to this text
     */
    public b(bold: string) {
        const b = document.createElement("b");
        b.innerText = bold;
        this.dom.insertAdjacentElement("beforeend", b);
        this._addText(bold);
        return this;
    }

    /**
     * Adds some italics text to this text
     */
    public i(italic: string) {
        const i = document.createElement("i");
        i.innerText = italic;
        this.dom.insertAdjacentElement("beforeend", i);
        this._addText(italic);
        return this;
    }

    /**
     * Adds some bold and italics text to this text
     */
    public bi(boldAndItalic: string) {
        const b = document.createElement("b");
        b.innerText = boldAndItalic;
        const i = document.createElement("i");
        i.insertAdjacentElement("beforeend", b);
        this.dom.insertAdjacentElement("beforeend", i);
        this._addText(boldAndItalic);
        return this;
    }

    /**
     * Adds a hyper reference to this text
     */
    public h(href: string, text?: string, newTab: boolean = true) {
        if (!text) text = href;
        const a = document.createElement("a");
        a.className = "Href";
        if (newTab) a.target = "_blank"; // Open new tab
        a.href = href;
        a.innerText = text;
        this.dom.insertAdjacentElement("beforeend", a);
        this._addText(text);
        return this;
    }

    /**
     * Adds a line break to this text
     */
    public br() {
        const lineBreak = document.createElement("br");
        lineBreak.className = "LineBreak";
        this.dom.insertAdjacentElement("beforeend", lineBreak);
        return this;
    }

    /**
     * Adds paragraph spacing to this text
     */
    public p() {
        const paragraph = document.createElement("br");
        paragraph.className = "Paragraph";
        this.dom.insertAdjacentElement("beforeend", paragraph);
        return this;
    }

    /**
     * Adds an Element to this text
     */
    public e(element: Element) {
        this.dom.insertAdjacentElement("beforeend", element.dom);
        return this;
    }
}

export default TextElement;