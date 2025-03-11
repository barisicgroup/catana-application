import Panel, {PanelOrientation} from "../panel";
import Element, {CallbackType} from "../element";
import {IconButton, IconToggle, IconType} from "../icon";
import {ButtonType} from "../button";
import {ToggleState} from "../toggle";

class CollapsiblePanel<ELEM extends Element> extends Panel {

    protected readonly bar: Panel;
    protected readonly button: IconButton;
    protected readonly barElement: ELEM;
    protected readonly content: Panel;

    public constructor(barElement: ELEM, ...contents: Element[]) {
        super();
        this.dom.className = "CollapsiblePanel";
        const scope = this;

        //this.buttonDom = document.createElement("div");
        //this.buttonDom.className = "CollapsiblePanelButton";
        //this.dom.appendChild(this.buttonDom);
        this.bar = new Panel(PanelOrientation.HORIZONTAL);
        this.bar.addClass("CollapsiblePanelBar");

        this.button = new IconButton(IconType.COLLAPSE, undefined, ButtonType.MINI)
            .addClass("CollapseButton")
            .addCallback(CallbackType.CLICK, () => scope.toggle());

        //this.label = new IconText(icon, text);
        this.barElement = barElement.addClass("CollapsiblePanelBarElement");

        this.content = new Panel(PanelOrientation.VERTICAL)
            .addClass("CollapsibleContent");
        this.add(...contents);

        this.bar.add(this.button, this.barElement);
        super.add(this.bar, this.content);
    }

    public addButton(icon: IconType): IconButton {
        const button = new IconButton(icon, undefined, ButtonType.MINI)
            .addClass("CollapsiblePanelBarButton");
        this.bar.add(button);
        return button;
    }

    public addToggle(state: ToggleState, iconOn: IconType, iconOff: IconType): IconToggle {
        const toggle = new IconToggle(state, iconOn, iconOff, undefined, undefined, ButtonType.MINI)
            .addClass("CollapsiblePanelBarButton");
        this.bar.add(toggle);
        return toggle;
    }

    public add(...elements) {
        this.content.add(...elements);
        return this;
    }

    public toggle() {
        this.setCollapsed(!this.isCollapsed());
        return this;
    }

    public setVisible(visible: boolean) {
        super.setVisible(visible);
        return this;
    }

    public setCollapsed(collapsed: boolean) {
        this.content.setVisible(!collapsed);
        this.button.setIcon(collapsed ? IconType.EXPAND : IconType.COLLAPSE);
        if (collapsed) {
            if (!this.dom.classList.contains("collapsed")) this.addClass("collapsed");
        } else {
            this.removeClass("collapsed");
        }
        return this;
    }

    public isCollapsed(): boolean {
        return this.dom.classList.contains("collapsed");
    }

    //public setLabel(label: string) {
        //this.label.setText(label);
        //return this;
    //}

    public getBarElement(): ELEM {
        return this.barElement;
    }

    //public setIcon(iconType: IconType) {
        //this.label.icon.set(iconType);
        //this.label.icon.setCollapsed(false);
    //}

    //public removeIcon() {
        //this.label.icon.setCollapsed(true);
    //}

    public clear(): this {
        this.content.clear();
        return this;
    }
}

export default CollapsiblePanel;