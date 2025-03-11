import Element, {CallbackType} from "../element";
import Button from "../button";
import Panel from "../panel";

class TabsMenu extends Panel {

    private readonly tabs: Panel;
    private readonly content: Panel;

    private readonly buttons: Button[] = [];
    private readonly elements: Element[] = [];

    public constructor() {
        super();
        this.addClass("TabsMenu");
        this.tabs = new Panel().addClass("TabsMenuBar");
        this.content = new Panel().addClass("TabsMenuContent");
        super.add(this.tabs, this.content);
    }

    public add(...elements) {
        for (const e of elements) {
            this.addTab("", e);
        }
        return this;
    }

    public addTab(name: string, element: Element) {
        const button = new Button(name)
            .addCallback(CallbackType.CLICK, () => {
                this.activate(element);
            });
            
        button.setTitle(name);

        this.buttons.push(button);
        this.elements.push(element);

        this.tabs.add(button);
        this.content.add(element);

        element.setVisible(false);
        if (this.elements.length === 1) this.activate(element);

        return this;
    }

    private deactivate() {
        for (const b of this.buttons) {
            b.setSelected(false);
        }
        for (const e of this.elements) {
            e.setVisible(false);
        }
    }

    public activate(element: Element) {
        this.deactivate();
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            const button = this.buttons[index];
            button.setVisible(true);
            button.setSelected(true);
        } else {
            console.error("Provided element is not in the TabsMenu. Use 'addTab' before using 'activate'. " +
                "Element: " + element);
            return;
        }
        element.setVisible(true);
    }

    public getSelectedIndex(): number {
        for (let i = 0; i < this.elements.length; ++i) {
            const e = this.elements[i];
            if (e.isVisible()) return i;
        }
        return -1;
    }

    public setSelectedIndex(index: number) {
        this.activate(this.elements[index]);
    }
}

export default TabsMenu;