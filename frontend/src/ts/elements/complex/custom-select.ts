import Panel, {PanelOrientation} from "../panel";
import TextElement from "../text-element";
import Globals from "../../globals";
import Element, {Callback, CallbackType} from "../element";
import SelectLike from "../select-like";

type CreateElementFun<V> = (v: V) => Element;

const defaultCreateElementFun: CreateElementFun<any> = (v: any) => {
    return new TextElement(typeof v === "string" ? v : "?");
};

// TODO
class CustomSelect<V> extends SelectLike<V> {

    private readonly changeCallbacks: Callback[] = [];

    private readonly createElementFun: CreateElementFun<V>;
    private readonly optionsPanel: Panel;

    private lastFocusIn: boolean = false;
    private optionsVisible: boolean = false;

    private active: null | Element = null;
    private selected: null | Element = null;

    public constructor(values: V[], initialValue: V, createElementFun?: CreateElementFun<V>, createHeaderFun?: CreateElementFun<V>) {
        super(initialValue, createHeaderFun || defaultCreateElementFun);

        if (!createElementFun && !(typeof initialValue === "string")) {
            console.error("The function 'createElementFun' must be provided if the type of the values is not 'string'");
        }

        // Creating functions
        this.createElementFun = v => createElementFun ? createElementFun(v) : defaultCreateElementFun(v);
        this.createHeaderFun = createHeaderFun
            ? v => createHeaderFun ? createHeaderFun(v) : new TextElement(typeof v === "string" ? v : "?")
            : this.createElementFun;

        this.optionsPanel = new Panel(PanelOrientation.VERTICAL).setVisible(false).addClass("CustomSelectPanel");
        for (const v of values) {
            const e = this.createElementFun(v).addClass("Option");
            if (!e) {
                console.error("Unable to create element for value " + v)
                continue;
            }
            e.addCallback(CallbackType.MOUSEDOWN, () => {
                this.setValue(v);
                this.deactivate();
                this.selected = e;
                for (const c of this.changeCallbacks) c(CallbackType.CHANGE, this);
            });
            e.addCallback(CallbackType.MOUSEMOVE, () => {
                if (this.selected) this.selected.removeClass("active");
                if (this.active) this.active.removeClass("active");
                this.active = e;
                this.active.addClass("active");
            });
            this.optionsPanel.add(e);
        }

        // Callbacks
        this.dom.tabIndex = 0; // Enables focus
        this.addCallback(CallbackType.FOCUSIN, () => {
            if (!this.optionsVisible) this.selectionChanged(true);
            this.lastFocusIn = true;
            this.optionsVisible = true;
        });
        this.addCallback(CallbackType.FOCUSOUT, () => {
            if (this.optionsVisible) this.selectionChanged(false);
            this.lastFocusIn = false;
            this.optionsVisible = false;
        });
        this.addCallback(CallbackType.CLICK, () => {
            if (!this.lastFocusIn) {
                this.optionsVisible = !this.optionsVisible;
                this.selectionChanged(this.optionsVisible);
            }
            this.lastFocusIn = false;
        });
    }

    public addCallback(types: CallbackType | CallbackType[], fun: Callback) {
        const rest = CustomSelect.filterOutTypes(types, CallbackType.CHANGE, (t) => {
            this.changeCallbacks.push(fun);
        });
        super.addCallback(rest, fun);
        return this;
    }

    private activate() {
        const bb = this.dom.getBoundingClientRect(); // bounding box
        Globals.tooltip?.activate(this.optionsPanel, bb.left, bb.bottom);
    }

    private deactivate() {
        //if (this.active) this.active.removeClass("active");
        //this.active = null;
        if (this.selected) this.selected.addClass("active");
        if (this.active) this.active.removeClass("active");
        this.active = null;
        Globals.tooltip?.deactivate();
    }

    public setOptionsVisible(selected: boolean, silent: boolean = false) {
        this.lastFocusIn = false;
        if (this.optionsVisible !== selected) {
            this.optionsVisible = selected;
            if (!silent) this.selectionChanged(selected);
        }
    }

    public areOptionsVisible(): boolean {
        return this.optionsVisible;
    }

    private selectionChanged(selected: boolean) {
        if (selected) this.activate();
        else this.deactivate();
    }

    public setValue(v: V) {
        // TODO implement this better
        // Find the element that corresponds to 'v' and make it be 'active'!
        if (this.selected) this.selected.removeClass("active");
        this.selected = null;

        super.setValue(v);
    }
}

export default CustomSelect;