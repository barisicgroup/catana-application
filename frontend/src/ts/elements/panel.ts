import Element from "./element";

export enum PanelOrientation {
    VERTICAL=1, HORIZONTAL=2
}

class Panel extends Element<HTMLDivElement> {
    public constructor(orientation?: PanelOrientation) {
        super(document.createElement("div"));
        this.dom.className = "Panel" + (orientation
            ? (" " + (orientation === PanelOrientation.VERTICAL ? "Vertical" : "Horizontal"))
            : "");
    }
    public add(...elements: Element[]) {
        for (const e of elements) {
            this.dom.appendChild(e.dom);
        }
        return this;
    }
}

export default Panel;