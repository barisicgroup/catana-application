import {
    CgStructureComponent,
    Component,
    LatticeComponent,
    LatticeType,
    PickingProxy, Representation,
    RepresentationElement,
    StructureComponent
} from "catana-backend";

import TreeView from "../../complex/treeview";
import { IconText, IconType } from "../../icon";
import Element, { CallbackType } from "../../element";
import Globals from "../../../globals";
import Panel from "../../panel";
import TextElement, { TextType } from "../../text-element";
import Select from "../../select";
import ComponentDetails from "./component-details";
import ComponentActions from "./component-actions";
import TabsMenu from "../../complex/tabs-menu";
import ComponentRepresentations from "./component-representations";
import { ToggleState } from "../../toggle";
import ComponentSequence from "./component-sequence";
import ComponentPlacement from "./component-placement";
import { RepresentationColorData, RepresentationsPanel } from "../representation";

function comp2icon(c: Component): IconType {
    if (c instanceof StructureComponent) {
        return IconType.STRUCTURE;
    } else if (c instanceof CgStructureComponent) {
        return IconType.CG_STRUCTURE;
    } else if (c instanceof LatticeComponent) {
        return c.latticeType === LatticeType.SQUARE ? IconType.SQUARE_LATTICE : IconType.HONEYCOMB_LATTICE;
    }
    return IconType.APP;
}

function comp2icontxt(c: Component): IconText {
    const it = new IconText(comp2icon(c), c.name);
    c.signals.nameChanged.add(name => it?.setText(name));
    return it;
}

export class ComponentsManager {
    private readonly _tree: ComponentsTreeView;
    private readonly _options: ComponentOptionsPanel;

    private readonly onViewerHoveredFun: (pickingProxy: PickingProxy) => void;
    private readonly onViewerClickedFun: (pickingProxy: PickingProxy) => void;

    private highlighted: null | Element<any> = null;

    public constructor() {
        this._tree = new ComponentsTreeView();
        this._options = new ComponentOptionsPanel();

        this.onViewerHoveredFun = (pickingProxy: PickingProxy) => {
            this.highlightComponent(pickingProxy ? pickingProxy.component : null);
        };
        this.onViewerClickedFun = (pickingProxy: PickingProxy) => {
            if (!pickingProxy || !pickingProxy.component) return;
            this.selectComponent(pickingProxy.component);
        };

        Globals.stage.catanaActions.signals.hover.add(this.onViewerHoveredFun);
        Globals.stage.catanaActions.signals.click_left.add(this.onViewerClickedFun);
    }

    public get tree(): Element {
        return this._tree;
    }

    public get options(): Element {
        return this._options;
    }

    public dispose() {
        this._tree.dispose();
        this._options.dispose();
        Globals.stage.catanaActions.signals.hover.remove(this.onViewerHoveredFun)
        Globals.stage.catanaActions.signals.click_left.remove(this.onViewerClickedFun);
        return this;
    }

    public addComponent(c: Component) {
        const node = this._tree.addNode(c);

        const hide = node.addToggle(ToggleState.ON, IconType.EYE, IconType.EYE_SLASH)
            .addCallback(CallbackType.CLICK, () => {
                c.setVisibility(hide.isOn());
            });

        c.signals.visibilityChanged.add(() => {
            hide.setState(c.visible ? ToggleState.ON : ToggleState.OFF);
            node.setVisible(c.visible);
        });

        const lock = node.addToggle(c.locked ? ToggleState.ON : ToggleState.OFF, IconType.LOCK, IconType.UNLOCK)
            .addCallback(CallbackType.CLICK, () => {
                c.setLocked(lock.isOn());
            });

        c.signals.lockedChanged.add(() => {
            lock?.setState(c.locked ? ToggleState.ON : ToggleState.OFF);
        });

        node.getBarElement()
            .addCallback(CallbackType.MOUSEENTER, () => this.highlightComponent(c))
            .addCallback(CallbackType.MOUSELEAVE, () => this.highlightComponent(null))
            .addCallback(CallbackType.CLICK, () => this.selectComponent(c))
            .addCallback(CallbackType.DBLCLICK, () => c.autoView(500));

        return this;
    }

    public removeComponent(c: Component) {
        this._tree.removeNode(c);
        this._options.removeComponent(c);
        Globals.stage.catanaVisManager.gizmoTransform.setVisible(false);
        return this;
    }

    private selectComponent(c: Component) {
        const index = this._options.getSelectedTabIndex();
        this._options.setComponent(c, index || undefined);
        this.highlightComponent(c);
    }

    private highlightComponent(c: null | Component) {
        if (this.highlighted) this.highlighted.removeClass("highlighted");
        if (!c) {
            this.highlighted = null;
            Globals.stage.viewer.unselect();
            Globals.stage.viewer.setCursor(null);
            this._options.removeClass("highlighted");
            return;
        }
        Globals.stage.viewer.smartSelect(c);
        Globals.stage.viewer.setCursor("pointer");
        if (this._options.component === c) this._options.addClass("highlighted");

        const node = this._tree.getNode(c);
        if (!node) {
            console.warn("Unexpected 'null' TreeViewNode for component with name: '" + c.name + "'." +
                " Viewer 'smartSelect' was called and the ComponentOptionsPanel was highlighted anyway.");
            return;
        }
        node.scrollIntoView();
        node.addClass("highlighted");
        this.highlighted = node;
    }
}

class ComponentsTreeView extends TreeView<Component, IconText> {
    public constructor() {
        super(comp2icontxt);
        this.addClass("ComponentsTreeView")
    }
}

interface CallbackFuns {
    nameChangedFun: () => void;
    representationAddedFun: (re: RepresentationElement) => void;
    representationRemovedFun: (re: RepresentationElement) => void;
}

class ComponentOptionsPanel extends Panel {
    private _component: null | Component = null;
    private _tabs: null | TabsMenu = null;
    private _representations: null | RepresentationsPanel = null;
    private callbackFuns: null | CallbackFuns = null;

    private readonly colorData: Map<Component, Map<Representation, RepresentationColorData>>;

    public constructor() {
        super();
        this.addClass("ComponentOptionsPanel");
        this.colorData = new Map<Component, Map<Representation, RepresentationColorData>>();
    }

    public get component(): null | Component {
        return this._component;
    }

    public getSelectedTabIndex(): null | number {
        return this._tabs?.getSelectedIndex() || null;
    }

    private save() {
        if (!this._component || !this._representations) return;
        this.colorData.set(this._component, this._representations.buildColorData());
    }

    public removeComponent(c: Component) {
        this.colorData.delete(c);
        if (this._component === c) this.setComponent(null);
    }

    public setComponent(c: null | Component, tabIndex?: number) {
        if (c === this._component) {
            return;
        } else {
            if (this._component && this.callbackFuns) {
                this._component.signals.nameChanged.remove(this.callbackFuns.nameChangedFun);
                this._component.signals.representationAdded.remove(this.callbackFuns.representationAddedFun);
                this._component.signals.representationRemoved.remove(this.callbackFuns.representationRemovedFun);
            }
            this.callbackFuns = null;
            this.save();
            this.clear();
            this._component = null;
            if (!c) {
                this.setVisible(false);
                return;
            }
        }
        this.setVisible(true);
        this._component = c;

        // Header
        const name = new TextElement(undefined, TextType.TITLE).addClass("ComponentOptionsPanelName");

        // Initialize tabs
        this._representations = new ComponentRepresentations(c, this.colorData.get(c));
        const sequence = new ComponentSequence(c);
        // Set up tabs menu
        this._tabs = new TabsMenu().addClass("ComponentOptionsPanelTabsMenu");

        this._tabs.addTab("Actions", new ComponentActions(c));
        this._tabs.addTab("Representations", this._representations);
        this._tabs.addTab("Sequence", sequence);
        this._tabs.addTab("Placement", new ComponentPlacement(c));
        this._tabs.addTab("Details", ComponentDetails.getComponentDetails(c));
        if (tabIndex) this._tabs.setSelectedIndex(tabIndex);

        // Add elements
        this.add(name, this._tabs);

        // Set up the name-changed function and its disposal
        const nameChangedFun = () => {
            name.setText(c.name);
        };
        nameChangedFun();
        c.signals.nameChanged.add(nameChangedFun);

        // Set up the representation functions
        const representationAddedFun = (re: RepresentationElement) => {
            this._representations!.addRepresentation(re, c);
            sequence.updateRepresentations();
        }
        const representationRemovedFun = (re: RepresentationElement) => {
            this._representations!.removeRepresentation(re);
            sequence.updateRepresentations();
        }
        c.signals.representationAdded.add(representationAddedFun);
        c.signals.representationRemoved.add(representationRemovedFun);

        // Save all callback functions
        this.callbackFuns = { nameChangedFun, representationAddedFun, representationRemovedFun };

        return this;
    }
}

// SELECT --------------------------------------------------------------------------------------------------------------

//type PromiseCallback = ((compList: Component[]) => Promise<void>);
type PromiseCallback = ((compList: Component[]) => Promise<Component[]>);
export class ComponentsSelect extends Select {

    private readonly compTypes: string[]; // TODO type
    private readonly promiseCallbacks: PromiseCallback[]; // TODO type
    private readonly excluded: Component[]; // TODO type

    private readonly updCompsSignal: () => void;
    private readonly addCompSignal: (c: Component) => void;
    private readonly remCompSignal: (c: Component) => void;

    private _lastOptsRemovalTimestamp: number;

    public constructor(compTypes: string[] = [], compPromiseCallbacks?: PromiseCallback[], allowMultiple: boolean = false, excluded: Component[] = []) {
        super([], allowMultiple);
        this.compTypes = compTypes;
        this.excluded = excluded;

        if (!compPromiseCallbacks) {
            const dummy: PromiseCallback = (list) => Promise.resolve(list);
            compPromiseCallbacks = new Array<PromiseCallback>(compTypes.length).fill(dummy);
        } else if (compTypes.length !== compPromiseCallbacks.length) {
            console.error("For each component type, one promise callback must be provided.");
        }
        this.promiseCallbacks = compPromiseCallbacks;

        this.updCompsSignal = () => this.updateComponents();
        this.addCompSignal = (c: Component) => {
            if (c) {
                c.signals.nameChanged.add(this.updCompsSignal);
            }
            this.updateComponents();
        };
        this.remCompSignal = (c: Component) => {
            if (c) {
                c.signals.nameChanged.remove(this.updCompsSignal);
            }
            this.updateComponents();
        };

        Globals.stage.signals.componentAdded.add(this.addCompSignal);
        Globals.stage.signals.componentRemoved.add(this.remCompSignal);

        this.updateComponents();
    }

    public dispose(): this {
        Globals.stage.signals.componentAdded.remove(this.addCompSignal);
        Globals.stage.signals.componentRemoved.remove(this.remCompSignal);
        super.dispose();
        return this;
    }

    public getComponents(): Component[] {
        const options = this.getSelectedOptions();
        if (options.length === 0) return [];
        const components: Component[] = [];
        for (const o of options) {
            const uuid = o.value;
            const index = Globals.stage.compList.findIndex(v => uuid === v.uuid);
            if (index === -1) {
                console.error("Component with uuid=" + uuid + " not found. This should not have happened. Ignoring...");
                // TODO handle differently! The user should maybe know that this component will not be used
                continue;
            }
            components.push(Globals.stage.compList[index]);
        }
        return components;
    }

    public updateComponents() {
        const list2dict = (list) => Object.assign({}, ...list.map((x) => ({ [x.uuid]: x.name })));
        const compsLists: Component[][] = [];
        let maxLen = 0;
        
        this.removeOptions();

        const currCallTimestamp = performance.now();
        this._lastOptsRemovalTimestamp = currCallTimestamp;


        this.compTypes.forEach(type => {
            const thisArr = Globals.stage?.compList.filter(x => x.type === type && this.excluded.indexOf(x) < 0);
            if (thisArr) {
                compsLists.push(thisArr);
                maxLen = Math.max(maxLen, thisArr.length);
            }
        });

        if (maxLen <= 0) {
            this.updateOptions({ default: "No available structures." });
            return;
        }

        compsLists.forEach((compList, i) => {
            if (compList.length > 0) {
                this.promiseCallbacks[i](compList).then(() => {
                    if (currCallTimestamp >= this._lastOptsRemovalTimestamp) {
                        this.addOptions(list2dict(compList), true);
                        
                        // If we have only one component, always select it by default
                        if (maxLen === 1) {
                            this.setSelectedIndex(0);
                        }
                    }
                });
            }
        });
    }
}
