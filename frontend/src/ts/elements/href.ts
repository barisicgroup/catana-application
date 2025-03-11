import Element from "./element";

class Href extends Element<HTMLAnchorElement> {
    public constructor(href: string, content?: Element) {
        super(document.createElement("a"));
        this.setHref(href);
        if (content) this.add(content);
    }

    public setHref(href: string) {
        this.dom.href = href;
    }

    public add(...elements: Element[]) {
        for (const e of elements) {
            this.dom.appendChild(e.dom);
        }
    }
}

export default Href;