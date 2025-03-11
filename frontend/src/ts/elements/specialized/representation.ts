import {
    CgStructureComponent,
    Color,
    Component,
    FilterColormaker,
    Representation,
    RepresentationElement,
    StructureComponent
} from "catana-backend";
import Element, {Callback, CallbackType} from "../element";
import {FilterInput} from "./filtering";
import ColorScaleSelect from "../complex/color-scale-select";
import ColorPicker from "../color-picker";
import Select from "../select";
import CATANA from "../../catana-instance";
import Panel, {PanelOrientation} from "../panel";
import Icon, {IconToggle, IconType} from "../icon";
import {ColorBarSize, ColorSequence} from "./color";
import Table, {TableType} from "../complex/table";
import IconTextCollapsiblePanel from "../complex/icontext-collapsible-panel";
import {ToggleState} from "../toggle";
import SelectLike from "../select-like";
import Globals from "../../globals";

type ColorScheme = [string, string, { scale: any; }] | [string, string];

export class RepresentationPanel extends IconTextCollapsiblePanel {

    private readonly _representation: Representation;
    private readonly _coloring: null | RepresentationColoringPanel;

    public constructor(reprElem: RepresentationElement, component: Component, colorData?: RepresentationColorData) {
        super(reprElem.name);
        this.addClass("RepresentationPanel");

        this._representation = reprElem.repr;

        // TODO reactivate?
        //this.addCallback(CallbackType.MOUSEENTER, () => {
        //console.log("ENTER REPRESENTATION");
        //Globals.stage?.viewer.smartSelect(Globals.stage.catanaSelection, component, reprElem.repr, undefined, true);
        //});

        const hideToggle = this.addToggle(reprElem.visible ? ToggleState.ON : ToggleState.OFF, IconType.EYE, IconType.EYE_SLASH);
        const trashButton = this.addButton(IconType.TRASH);

        // Set up hide toggle
        hideToggle.setTitle("Show/hide");
        hideToggle.addCallback(CallbackType.CLICK, () => {
            reprElem.setVisibility(hideToggle.isOn());
            //Globals.stage?.viewer.requestRender();
        });
        reprElem.signals.visibilityChanged.add(status => {
            hideToggle.setState(status ? ToggleState.ON : ToggleState.OFF, true)
        });

        // Set up trash button
        trashButton.setTitle("Remove representation");
        trashButton.addCallback(CallbackType.CLICK, () => reprElem.dispose());

        if (component instanceof StructureComponent || component instanceof CgStructureComponent) {
            this._coloring = new RepresentationColoringPanel(component, reprElem.repr, colorData);

            const filterStr = reprElem.repr.filterString;
            const filterField = new FilterInput(filterStr, component)
                .addCallback(CallbackType.CHANGE, () => {
                    reprElem.setFilter(filterField.getValue());
                });

            reprElem.signals.filterChanged.add(newString => {
                filterField.setValue(newString);
            });

            this.add(
                RepresentationPanel.createBar(IconType.COLORING, "Coloring", this._coloring),
                RepresentationPanel.createBar(IconType.FILTER, "Filter", filterField));

        } else {
            this._coloring = null;
        }
    }

    public get representation(): Representation {
        return this._representation;
    }

    private static createBar(iconType: IconType, title: string, ...elements: Element[]): Element {
        const icon = new Icon(iconType).setTitle(title);
        return new Panel(PanelOrientation.HORIZONTAL).addClass("RepresentationBar").add(icon, ...elements);
    }

    public buildColorData(): null | RepresentationColorData {
        return this._coloring?.buildData() || null;
    }
}

interface RepresentationColorEntry {
    filterStr: string,
    color: string,
    active: boolean
}

export interface RepresentationColorData {
    scheme: string,
    scale: string,
    entries: RepresentationColorEntry[],
    open: boolean
}

export class RepresentationColoringPanel extends Panel {

    private generalColorScheme: string;
    private currentColorScheme: string;

    private readonly representation: Representation;

    private readonly scheme: Select;
    private readonly override: SelectLike<string[]>;
    private readonly scale: ColorScaleSelect;
    private readonly editor: CustomColorEditor;

    private readonly content: Panel;

    public constructor(component: Component, representation: Representation, colorData?: RepresentationColorData) {
        super(PanelOrientation.VERTICAL);
        this.addClass("RepresentationColoringPanel");

        this.representation = representation;

        let entries: RepresentationColorEntry[];

        if (colorData) {
            entries = colorData.entries;
            this.generalColorScheme = colorData.scheme;

        } else {
            const colorParams = representation.getColorParams();
            this.generalColorScheme = colorParams.scheme; // Get name of the color scheme of the representation (e.g., 'chainname')
            //const schemeClass = CATANA.ColormakerRegistry.userSchemes[this.generalColorScheme];

            let params: any = { scheme: this.generalColorScheme };

            // Necessary to pass also structures' references otherwise the getScheme
            // may sometimes fail (e.g., when creating SstrucColorMaker)
            if (component instanceof StructureComponent) {
                params.structure = component.structure;
            } else if (component instanceof CgStructureComponent) {
                params.cgStructure = component.cgStructure;
            }

            const scheme = CATANA.ColormakerRegistry.getScheme(params);
            entries = [];
            if (scheme instanceof FilterColormaker) {
                const filters: string[] = scheme.filterList.map(v => v.string);
                const colormakers: any[] = scheme.colormakerList;
                let i = 0;
                for (; i < colormakers.length - 1; ++i) { // Skip last
                    const colorValue = colormakers[i].parameters.value;
                    entries.push({
                        filterStr: filters[i],
                        color: "#" + new Color(colorValue).getHexString(),
                        active: true
                    });
                }
                this.generalColorScheme = colormakers[i].parameters.scheme;
            }
        }

        // Initialize elements
        // Coloring
        this.scheme = this.createColorSchemeElement(component, representation)
            .setTitle("Color scheme");
        this.scale = this.createColorScaleElement(representation)
            .setTitle("Color scale");
        this.override = this.createColorOverrideElement()
            .setTitle("Custom colors by filtering");
        const bar = new Panel(PanelOrientation.HORIZONTAL).addClass("RepresentationColoringBar")
            .add(this.scheme, this.scale, this.override);

        // Initialize based on data
        let open = false;
        if (colorData) {
            this.scale.setValue(colorData.scale);
            open = colorData.open;
        }

        // Set up coloring editor
        this.editor = this.createCustomColorEditorElement(component, entries);
        this.content = new Panel().addClass("RepresentationColoringContent").setVisible(open).add(this.editor);

        // Wrap up
        this.add(bar, this.content);
        this.updateColor();
    }

    private createColorSchemeElement(component: Component, representation: Representation): Select {
        const select = new Select();

        // Create the list of options that will be displayed in the comboboxes (i.e., all the available color schemes and scales)
        const schemeOptions = Object.keys(CATANA.ColormakerRegistry.getSupportedSchemes(component, false));

        // TODO: HOT FIX! Remove this eventually
        if (component instanceof CgStructureComponent && representation.getType && representation.getType() === "atomic") {
            for (const schemeToRemove of ["cg-custom", "crossover", "direction gradient"]) {
                const index = schemeOptions.indexOf(schemeToRemove);
                if (index !== -1) {
                    schemeOptions.splice(index, 1);
                }
            }
        }

        // Add callback for when a new color scheme is selected
        select.addCallback(CallbackType.CHANGE, () => {
            const scale = CATANA.ColormakerRegistry.getSchemeScale(select.getValue());
            this.setScale(scale);

            this.generalColorScheme = select.getValue();
            this.updateColor();
        });

        // Select the option of the current color scheme
        const colorSchemeIndex = schemeOptions.indexOf(this.generalColorScheme);
        if (colorSchemeIndex !== -1) {
            select.updateOptions(schemeOptions);
            select.setSelectedIndex(colorSchemeIndex);
        } else {
            select.updateOptions(["custom"].concat(schemeOptions));
        }

        return select;
    }

    private createColorOverrideElement(): SelectLike<string[]> {
        //return new ColorSequence(ColorBarSize.WIDE).addClass("Select");
        return new SelectLike<string[]>([], (colors) => {
            return new ColorSequence(ColorBarSize.WIDE, colors);
        });
    }

    private createColorScaleElement(representation: Representation): ColorScaleSelect {
        return new ColorScaleSelect(representation, 20).addCallback(CallbackType.CHANGE, () => this.updateColor());
    }

    private createCustomColorEditorElement(component: Component, entries?: { filterStr: string, color: string }[]): CustomColorEditor {
        const editor = new CustomColorEditor(component, entries).addCallback(CallbackType.CHANGE, () => {
            const schemes = this.editor.buildSchemes();
            const colors = new Array<string>(schemes.length);
            for (let i = 0; i < schemes.length; ++i) colors[i] = schemes[i][0];
            this.override.setValue(colors);
            this.updateColor(schemes);
        });
        this.override.addCallback(CallbackType.CLICK, () => {
            if (this.content.isVisible()) {
                this.content.setVisible(false);
                this.override.removeClass("selected");
            } else {
                this.content.setVisible(true);
                this.override.addClass("selected");
            }
        });
        return editor;
    }

    //private setScaleEnabled(active: boolean, colors?: number[] | null) {
    private setScale(colors: null | number[]) {
        this.scale.setEnabled(colors !== null);
        // TODO display 'colors'
    }

    private updateColor(schemes?: ColorScheme[]) {
        if (!schemes) schemes = this.editor.buildSchemes();
        schemes.push([this.generalColorScheme, "*", { scale: this.scale.getValue() }]);
        if (this.currentColorScheme) CATANA.ColormakerRegistry.removeScheme(this.currentColorScheme);
        this.currentColorScheme = CATANA.ColormakerRegistry.addFilterScheme(schemes as any);
        this.representation.setColor(this.currentColorScheme);
    }

    public buildData(): RepresentationColorData {
        return {
            scheme: this.generalColorScheme,
            scale: this.scale.getValue(),
            entries: this.editor.buildData(),
            open: this.content.isVisible()
        };
    }
}

class CustomColorEditor extends Panel {

    private changeCallbacks: Callback[] = [];

    private readonly table: CustomColorEditorTable;

    public constructor(component: Component, entries?: { filterStr: string, color: string }[]) {
        super(PanelOrientation.VERTICAL);
        this.addClass("CustomColorEditor");

        //const importButton = new Button("Import from Sequence editor")
        //.addCallback(CallbackType.CLICK, this.importFromSequenceEditor);
        this.table = new CustomColorEditorTable(component, entries)
            .addCallback(CallbackType.CHANGE, () => this.update());

        //this.add(importButton, this.table);
        this.add(this.table);
    }

    /*private importFromSequenceEditor() {
        if (Globals.sequenceEditor === null) return;

        const selectedElements = Globals.sequenceEditor?.editor.selectedElements;
        let filterStr = ":" + Globals.sequenceEditor?.options.chainName;
        if (selectedElements && selectedElements.length > 0) {
            filterStr += " AND (";
            filterStr += selectedElements.filter(e => e.sequenceIndex !== null).join(" OR ");
            filterStr += ")";
        }

        const lastRow = this.table.getLastRow();

        // If the last filter is empty
        if (lastRow[0].getValue() === "") {
            lastRow[0].setValue(filterStr);
        } else {
            this.table.addFilter(filterStr);
        }
        this.table.addFilter("");
    }*/

    public addCallback(types: CallbackType | CallbackType[], fun: Callback) {
        const rest = CustomColorEditor.filterOutTypes(types, CallbackType.CHANGE, (t) => {
            this.changeCallbacks.push(fun);
        })
        super.addCallback(rest, fun);
        return this;
    }

    private update() {
        for (const c of this.changeCallbacks) c(CallbackType.CHANGE, this);
    }

    public buildSchemes(): ColorScheme[] {
        return this.table.buildSchemes();
    }

    public buildData(): RepresentationColorEntry[] {
        return this.table.buildData();
    }
}

type CustomColorEditorTableRow = [FilterInput, ColorPicker, IconToggle];

class CustomColorEditorTable extends Table<CustomColorEditorTableRow> {

    private changeCallbacks: Callback[] = [];

    public constructor(readonly component: Component, entries?: { filterStr: string, color: string }[]) {
        super(3, TableType.COMPACT, true, true, [1, 0, 0]);
        //this.dom.className = "CustomColorEditorTable";

        this.addOnRowMovedCallback((key) => this.update());
        this.addOnRowDeletedCallback((key) => {
            if (this.rowCount === 0) this.addFilter("");
            this.update();
        });

        if (entries) {
            for (const e of entries) {
                this.addFilter(e.filterStr, e.color, true, true);
            }
        }
        this.addFilter("");
    }

    public addFilter(filterStr: string, color: string = "#ff0000", active: boolean = true, silent: boolean = false) {
        const filterInput = new FilterInput(filterStr, this.component)
            .addCallback(CallbackType.CHANGE, () => {
                const filterEmpty = filterInput.getValue().length > 0;
                const lastOption = this.indexOf(row) === (this.rowCount - 1);
                if (filterEmpty && lastOption) {
                    this.addFilter("");
                }
                this.update();
            });
        const colorPicker = new ColorPicker(color)
            .addCallback(CallbackType.INPUT, () => {
                this.update();
            });
        const activeToggle = new IconToggle(active ? ToggleState.ON : ToggleState.OFF, IconType.EYE, IconType.EYE_SLASH)
            .addCallback(CallbackType.CHANGE, () => {
                //this.disabled[this.filters.indexOf(filter)] = hide.isOn();
                this.update();
            });

        const row: CustomColorEditorTableRow = [filterInput, colorPicker, activeToggle];
        this.addRow(row);
        if (!silent && filterStr !== "") this.update();
        return this;
    }

    private update() {
        for (const c of this.changeCallbacks) c(CallbackType.CHANGE, this);
    }

    public buildSchemes(): ColorScheme[] {
        const schemes: ColorScheme[] = [];
        this.forEachRow((r) => {
            const hidden: boolean = !r[2].isOn();
            if (hidden) return;

            const filterStr: string = r[0].getValue();
            if (filterStr === "") return;

            const color: string = r[1].getValue();
            schemes.push([color, filterStr]);
        });
        return schemes;
    }

    // TODO find out a better way to override a callback... like in the class Element, have a function overrideCallback or something...
    public addCallback(types: CallbackType | CallbackType[], fun: Callback) {
        const rest = CustomColorEditorTable.filterOutTypes(types, CallbackType.CHANGE, (t) => {
            this.changeCallbacks.push(fun);
        });
        super.addCallback(rest, fun);
        return this;
    }

    public buildData(): RepresentationColorEntry[] {
        const data: RepresentationColorEntry[] = [];
        this.forEachRow((r) => {
            if (r[0].getValue() === "") return; // Ignore rows with empty filter
            data.push({
                filterStr: r[0].getValue(),
                color: r[1].getValue(),
                active: r[2].isOn()
            });
        });
        return data;
    }
}

export class RepresentationsPanel extends Panel {

    private list: RepresentationPanel[] = [];

    public constructor(c: Component, colorData?: Map<Representation, RepresentationColorData>) {
        super(PanelOrientation.VERTICAL);
        this.addClass("RepresentationsPanel");
        const supportedRepresentations = RepresentationsPanel.getSupportedRepresentations(c);
        if (supportedRepresentations.length === 1) this.setEnabled(false, "This component does not support representations.");
        const sel = new Select(supportedRepresentations)
            .addCallback(CallbackType.CHANGE, () => {
                /*const index = sel.getSelectedIndex();
                if (index === 0) return;
                const type = sel.getValue();
                c.addRepresentation(type, {});
                sel.setSelectedIndex(0);*/
                if (sel.getSelectedIndex() > 0) {
                    Globals.animatedLoader?.show();
                    setTimeout(() => {
                        c.addRepresentation(sel.getValue(), {});
                        sel.setSelectedIndex(0);
                        Globals.animatedLoader?.hide();
                    }, 16);
                }
            });
        //this.add(new TextElement("Representations"));
        this.add(sel);
        c.eachRepresentation((reprElem) => {
            this.addRepresentation(reprElem, c, colorData?.get(reprElem.repr));
        });
    }

    public addRepresentation(re: RepresentationElement, c: Component, colorData?: RepresentationColorData) {
        const panel = new RepresentationPanel(re, c, colorData);
        this.list.push(panel);
        this.add(panel);
        return this;
    }

    public removeRepresentation(re: RepresentationElement) {
        for (let i = 0; i < this.list.length; ++i) {
            const panel = this.list[i];
            if (panel.representation === re.repr) {
                panel.dispose();
                this.list.splice(i, 1);
            }
        }
        // TODO warn/error if representation was not found?
    }

    private static getSupportedRepresentations(c: Component): string[] {
        let options = ["[ add representation ]"];
        if (c instanceof CgStructureComponent) {
            options = options.concat(CATANA.CoarseGrainedRepresentationRegistry.names);
        } else if (c instanceof StructureComponent) {
            options = options.concat(CATANA.RepresentationRegistry.names);
        } else {
            //console.error("Unable to get supported representations from Component. Component name: " + c.name);
            return ["[ no representations available ]"];
        }
        return options;
    }

    public buildColorData(): Map<Representation, RepresentationColorData> {
        const map = new Map<Representation, RepresentationColorData>();
        for (const p of this.list) {
            const colorData = p.buildColorData();
            if (colorData) map.set(p.representation, colorData);
        }
        return map;
    }
}