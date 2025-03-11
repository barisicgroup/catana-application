import CollapsiblePanel from "./collapsible-panel";
import {IconText, IconType} from "../icon";
import Element from "../element";

class IconTextCollapsiblePanel extends CollapsiblePanel<IconText> {
    public constructor(text: string, icon?: IconType, ...contents: Element[]) {
        super(new IconText(icon, text), ...contents);
    }

    public setLabel(label: string) {
        this.barElement.setText(label);
        return this;
    }
}

export default IconTextCollapsiblePanel;