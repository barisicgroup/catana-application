import MovableModalBox from "../modal/movable-modal-box";

import {Component} from "catana-backend";
import Globals from "../../globals";
import TextElement from "../text-element";
import Select from "../select";
import {CallbackType} from "../element";
import Panel, {PanelOrientation} from "../panel";
import TitledPanel from "../complex/titled-panel";
import CATANA from "../../catana-instance";
import InputAutocomplete from "../complex/input-autocomplete";
import {NUMBER_OPTIONS_LIMIT} from "../../constants";
import {SimpleFormTable} from "../complex/table";
import { IconType } from "../icon";

export class FilterInput extends InputAutocomplete {
    public constructor(filterStr: string, component?: Component) {
        super(filterStr,
            (text: string) => FilterInput.getSuggestions(text, component),
            FilterInput.applySuggestion);
        //this.setPlaceholder("Click and start typing to get suggestions");
        //this.setPlaceholder("Type here");
        this.setPlaceholder("e.g.: 'cys', 'all', 'hydrophobic'");
    }

    private static getSuggestions(text: string, component?: Component): null | string[] {
        return component === undefined
            ? null
            : CATANA.getSuggestions(text, component, NUMBER_OPTIONS_LIMIT);
    }

    private static applySuggestion(optionStr: string, fulltextStr: string): null | string {
        return CATANA.applySuggestion(optionStr, fulltextStr);
    }

    public getValue() {
        return super.getValue();//.trim();
    }
}

export class FilteringModalBox extends MovableModalBox {

    //private static readonly STR_NO_COMP_SEL = "No component selected";
    private static readonly STR_SET_COMP = "[ set component ]";

    private components: Component[] = [];

    private panels: { [id: string]: TitledPanel };

    //private readonly selectedComponentText: TextElement;
    private readonly selectComponent: Select;
    private readonly optionsPanel: Panel;

    public constructor(component?: Component, icon?: IconType) {
        super("Filtering help", false, icon);
        this.addClass("FilteringModalBox");

        const selectLabel = new TextElement("Component:");
        //this.selectedComponentText = new TextElement(FilteringModalBox.STR_NO_COMP_SEL);

        this.selectComponent = new Select([FilteringModalBox.STR_SET_COMP])
            .addCallback(CallbackType.CHANGE, () => {
                const index = this.selectComponent.getSelectedIndex();
                this.setComponent(index > 0 ? this.components[index - 1] : undefined);
            });

        Globals.stage?.signals.componentAdded.add(() => this.updateOptions());
        Globals.stage?.signals.componentRemoved.add(() => this.updateOptions());

        const table = new SimpleFormTable();
        table.addRow([selectLabel, this.selectComponent]);

        this.optionsPanel = new Panel(PanelOrientation.VERTICAL)
            .add(new TextElement("Hover over a keyword for a detailed description."), table);

        const filtersPanel = new Panel(PanelOrientation.VERTICAL);
        this.panels = {};

        const panelsInfo = [ // TODO make link with CATANA less/not hardcoded
            { name: "General", id: "general" },
            { name: "Chains", id: "chains" },
            { name: "Residues", id: "residues" },
            { name: "Models", id: "models" },
            { name: "Atoms", id: "atoms" },
            { name: "Elements", id: "elements" }
        ];

        for (let info of panelsInfo) {
            const panel = new TitledPanel(info.name);
            this.panels[info.id] = panel;
            filtersPanel.add(panel);
        }

        this.add(this.optionsPanel);
        this.add(filtersPanel);

        this.setComponent(component);
    }

    private getComponents(): Component[] {
        const components: Component[] = [];
        Globals.stage?.eachComponent((c) => components.push(c));
        return components;
    }

    private updateOptions() {
        this.components = this.getComponents();
        const names: string[] = [];
        for (let c of this.components) names.push(c.name);
        this.selectComponent.updateOptions([FilteringModalBox.STR_SET_COMP].concat(names));
        this.selectComponent.setSelectedIndex(0);
    }

    public setComponent(component?: Component) {
        const keywordObjects = CATANA.getKeywords(component);
        for (let id of Object.keys(this.panels)) {
            const panel = this.panels[id];
            if (keywordObjects[id]) {
                panel.clear();
                for (let kwdObj of keywordObjects[id]) {
                    const text = new TextElement(kwdObj.keywordDisplayName);
                    text.setTitle(kwdObj.description);
                    panel.add(text);
                    text.dom.draggable = true;
                    text.addCallback(CallbackType.DRAGSTART, (type, src, e: DragEvent) => {
                        e.dataTransfer?.setData("text", kwdObj.keyword); // TODO to something better than use '?' here?
                    });
                }
                panel.setVisible(true);
            } else {
                panel.setVisible(false);
            }
        }
        //this.selectedComponentText.setText(component
            //? ("Selected: " + component.name)
            //: FilteringModalBox.STR_NO_COMP_SEL)
    }
}