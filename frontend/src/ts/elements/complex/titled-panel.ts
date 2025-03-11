import Panel, {PanelOrientation} from "../panel";
import Element from "../element";
import TextElement from "../text-element";

class TitledPanel extends Panel {

    private readonly content: Panel;

    public constructor(title: string, orientation?: PanelOrientation) {
        super();
        this.addClass("TitledPanel");
        this.content = new Panel(orientation).addClass("Content");
        this.dom.appendChild(new TextElement(title).addClass("Header").dom);
        this.dom.appendChild(this.content.dom);
    }

    public add(...elements: Element<HTMLElement>[]) {
        this.content.add(...elements);
        return this;
    }

    public clear() {
        this.content.clear();
        return this;
    }
}

export default TitledPanel