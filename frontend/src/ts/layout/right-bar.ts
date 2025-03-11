import MainPanel from "./main-panel";
import Globals from "../globals";
import {ComponentsManager} from "../elements/specialized/component/component";
import {PanelOrientation} from "../elements/panel";

class RightBar extends MainPanel {
    public constructor() {
        super(PanelOrientation.VERTICAL);

        const signals = Globals.stage!.signals;

        const componentsManager = new ComponentsManager();

        componentsManager.tree.dom.setAttribute("data-header-text", "Workspace");
        componentsManager.options.dom.setAttribute("data-header-text", "Inspector");

        this.start.add(componentsManager.tree);
        this.end.add(componentsManager.options);

        signals.componentAdded.add((component) => {
            if (component.backendOnly) return;
            componentsManager.addComponent(component);
        });

        signals.componentRemoved.add((component) => {
            if (component.backendOnly) return;
            componentsManager.removeComponent(component);
        });
    }

    public static getWidth(): number {
        return MainPanel.FULL;
    }

    public setDimensionsRem(dim: { width: number, top: number }) {
        this.getStyle().width = dim.width + "rem";
        this.getStyle().top = dim.top + "rem";
        this.setVisible(!!dim.width);
    }
}

export default RightBar;