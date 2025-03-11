import TopBar from "./top-bar";
import RightBar from "./right-bar";
import BottomBar from "./bottom-bar";
import LeftBar from "./left-bar";
import Element from "../elements/element";
import Globals from "../globals";
import ScriptPanel from "./script-panel";
import { StructureComponent } from "catana-backend";

type Layout = Element[];

class LayoutManager {

    private layouts: { [id: string]: Layout } = {};
    private active: null | string = null;

    public readonly topBar: TopBar;
    public readonly rightBar: RightBar;
    public readonly bottomBar: BottomBar;
    public readonly leftBar: LeftBar;

    private readonly viewport: Element;
    private readonly scripting: ScriptPanel;

    constructor(parent: Element) {
        const stage = Globals.stage!;

        this.topBar = new TopBar().setId("topBar");
        this.bottomBar = new BottomBar().setId("bottomBar");
        this.rightBar = new RightBar().setId("rightBar");
        this.leftBar = new LeftBar().setId("leftBar");
        this.viewport = new Element(Globals.stage!.viewer.container).addClass("Main").setId("viewport");
        this.scripting = new ScriptPanel(stage).setId("scripting");

        parent.dom.appendChild(this.topBar.dom);
        parent.dom.appendChild(this.bottomBar.dom);
        parent.dom.appendChild(this.rightBar.dom);
        parent.dom.appendChild(this.leftBar.dom);
        parent.dom.appendChild(this.viewport.dom);
        parent.dom.appendChild(this.scripting.dom);

        // Layouts
        const layoutElements_vis: Element[] = [this.topBar, this.bottomBar];
        const layoutElements_cg: Element[] = ([this.topBar, this.bottomBar, this.leftBar, this.rightBar] as Element[])
            .concat(this.leftBar.cgElements, this.leftBar.commonElements);
        const layoutElements_aa: Element[] = ([this.topBar, this.bottomBar, this.leftBar, this.rightBar] as Element[])
            .concat(this.leftBar.aaElements, this.leftBar.commonElements);
        const layoutElements_script: Element[] = [this.topBar, this.bottomBar, this.scripting];

        // Make manager and utility functions
        this.topBar.addOnLayoutSelectedCallback((id: string) => {
            this.activate(id);
        });

        const addLayout = (id: string, name: string, elements: Element[]) => {
            this.topBar.addLayout(id, name);
            this.addLayout(id, elements,)
        }

        const setLayout = (id: string) => {
            this.topBar.setLayout(id);
            this.activate(id);
        }

        // Register layouts
        addLayout("vis", "Visualization", layoutElements_vis);
        addLayout("cg", "Coarse-grained modeling", layoutElements_cg);
        addLayout("aa", "All-atom modeling", layoutElements_aa);
        addLayout("script", "Command-line interface", layoutElements_script);

        // Default layout
        setLayout("cg");

        // If the first component to be loaded is fully atomistic structure,
        // automatically swap to atom modeling layout
        stage.signals.componentAdded.addOnce(comp => {
            if (this.active !== "script" && comp instanceof StructureComponent) {
                setLayout("aa");
            }
        });
    }

    public addLayout(id: string, elements: Element[]) {
        const layout: Layout = elements;
        if (this.layouts[id] && this.active === id) this.deactivate();
        this.layouts[id] = layout;
        return this;
    }

    public deactivate() {
        for (const layout of Object.values(this.layouts)) {
            for (const e of layout) {
                e.setVisible(false);
            }
        }
        this.active = null;
        return this;
    }

    public activate(layout: string | Layout) {
        this.deactivate();
        if (typeof layout === "string") {
            this.active = layout
            layout = this.layouts[layout];
            if (!layout) return;
        }
        for (const e of layout) {
            e.setVisible(true);
        }

        const _top = layout.includes(this.topBar) ? TopBar.getHeight() : 0;
        const _right = layout.includes(this.rightBar) ? RightBar.getWidth() : 0;
        const _bottom = layout.includes(this.bottomBar) ? BottomBar.getHeight() : 0;
        const _left = layout.includes(this.leftBar) ? LeftBar.getWidth() : 0;

        const top = _top + "rem";
        const right = _right + "rem";
        const bottom = _bottom + "rem";
        const left = _left + "rem";

        this.topBar.setDimensionsRem({ height: _top, right: _right });
        this.rightBar.setDimensionsRem({ width: _right, top: _top });
        this.bottomBar.setDimensionsRem({ height: _bottom, right: _right });
        this.leftBar.setDimensionsRem({ width: _left, top: _top, bottom: _bottom });
        this.scripting.setDimensionsRem({ right: _right, left: _left, bottom: _bottom });

        this.viewport.getStyle().top = top;
        this.viewport.getStyle().right = right;
        this.viewport.getStyle().bottom = bottom;
        this.viewport.getStyle().left = left;
        Globals.stage?.handleResize();

        this.scripting.setVisible(layout.includes(this.scripting));

        return this;
    }
}

export default LayoutManager;