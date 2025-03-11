import Panel, {PanelOrientation} from "../panel";
import Globals from "../../globals";
import Element, {CallbackType} from "../element";
import Button, {ButtonType} from "../button";

export enum DropdownType {
    NORMAL=1, MINI=2
}

class Dropdown extends Panel {

    private panel: Panel;

    protected createButton(text: string, type?: ButtonType): Button {
        return new Button(text, type);
    }

    private static dt2bt(dt?: DropdownType): undefined | ButtonType {
        if (!dt) return undefined;
        switch (dt) {
            case DropdownType.MINI:
                return ButtonType.MINI;
            default:
                console.error("Unexpected DropdownType '" + dt + "'");
                // Fallthrough
            case DropdownType.NORMAL:
                return ButtonType.NORMAL;
        }
    }

    public constructor(text: string, type?: DropdownType, down: boolean = true) {
        super(PanelOrientation.VERTICAL);
        this.dom.className = "Dropdown" + (type === DropdownType.MINI ? " Mini" : "");
        const scope = this;

        const button = this.createButton(text, Dropdown.dt2bt(type));
        super.add(button);

        this.panel = new Panel(PanelOrientation.VERTICAL).addClass("DropdownPanel");

        this.addCallback([CallbackType.MOUSEENTER, CallbackType.MOUSELEAVE], (type, src : any, e: MouseEvent) => {
            if (!Globals.tooltip) {
                console.error("Globals.tooltip is undefined");
                return;
            }
            if (type === CallbackType.MOUSEENTER) {
                const bb = scope.dom.getBoundingClientRect();
                Globals.tooltip.activate(scope.panel, bb.left, down ? bb.bottom : bb.top, down);
            } else if (!scope.panel.dom.contains(e.relatedTarget as HTMLElement)) {
                Globals.tooltip.deactivate();
            }
        });

        this.panel.addCallback(CallbackType.MOUSELEAVE, (type, src, e) => {
            Globals.tooltip?.deactivate();
        });
    }

    public add(...elements: Element<HTMLElement>[]) {
        this.panel.add(...elements);
        return this;
    }
}

export default Dropdown;