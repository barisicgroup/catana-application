import Panel from "./panel";
import Element from "./element";

class Tooltip extends Panel {

    private tooltipActiveElement: any; // TODO type

    public constructor() {
        super();
        this.dom.className = "Tooltip";
        this.tooltipActiveElement = null;
    }

    public add(...elements) {
        for (const e of elements) e.setVisible(false);
        return super.add(...elements);
    }

    public deactivate() {
        if (this.tooltipActiveElement) {
            this.tooltipActiveElement.setVisible(false);
            this.tooltipActiveElement = null;
        }
        this.setVisible(false);
        return this;
    }

    public activate(element: Element<any>, x: number, y: number, down: boolean = true) {
        this.deactivate();
        if (!this.dom.contains(element.dom)) {
            this.add(element);
        }
        this.tooltipActiveElement = element;

        element.setVisible(true);
        this.setVisible(true);

        this.getStyle().left = Math.min(x, window.innerWidth - this.dom.offsetWidth) + "px";
        this.getStyle().top = (down ? y : y - this.dom.getBoundingClientRect().height) + "px";

        return this;
    }
}

export default Tooltip;