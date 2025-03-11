import MovableModalBox from "./movable-modal-box";
import {SimpleFormTable} from "../complex/table";
import TextElement from "../text-element";
import RadioGroupPanel from "../complex/radio-group.panel";
import {CallbackType} from "../element";
import {ComponentsSelect} from "../specialized/component/component";
import Button from "../button";
import {
    CgStructureComponent, Component,
    Structure,
    StructureComponent,
    mergeStructures,
    PdbWriter
} from "catana-backend";
import {IconType} from "../icon";
import CatanaServer from "../../networking/networking";

type Type = "aa" | "cg";

const typeMap: { [id: string]: Type } = {
    "All-atom": "aa",
    "Coarse-grained": "cg"
}

class RelaxationModal extends MovableModalBox {

    private readonly radiosPanel: RadioGroupPanel;
    private readonly componentsSelect: ComponentsSelect;

    public constructor() {
        super("Relaxation", false, IconType.RELAXATION);

        const table = new SimpleFormTable();

        { // Type
            this.radiosPanel = new RadioGroupPanel(Object.keys(typeMap));
            table.addRow([new TextElement("Type"), this.radiosPanel]);
        }

        { // Components/Structures select
            this.componentsSelect = new ComponentsSelect(
                ["structure", "cg-structure"],
                [list => Promise.resolve(list), list => Promise.resolve(list)],
                true
            );
            table.addRow([new TextElement("Components"), this.componentsSelect]);
        }

        const button = new Button("Relax remotely").addCallback(CallbackType.CLICK, () => {
            const typeDisplayName = this.radiosPanel.getValue();
            if (!typeDisplayName) return;
            const type = typeMap[typeDisplayName];

            const components = this.componentsSelect.getComponents();
            const promises: Promise<{c: Component, s: Structure}>[] = [];
            for (const c of components) {
                if (c instanceof StructureComponent) {
                    promises.push(new Promise(resolve => resolve({ c: c, s: c.structure })));
                } else if (c instanceof CgStructureComponent) {
                    promises.push(c.cgStructure.buildAtomicStructure().then((s) => { return { c: c, s: s }}));
                } else {
                    console.error("Unexpected component type: " + c.name + ". Only StructureComponent and CgStructureComponent are allowed");
                    // TODO: Handle this better maybe? Maybe let use know that this happened?
                }
            }
            if (promises.length === 0) return;
            Promise.all(promises).then((structures) => {
                // TODO check for structures.length === 0?
                const name = structures.map(v => v.s.name).join("_").replace(/\.pdb/g, "");
                const merged = mergeStructures(name, structures.map(v => v.s), structures.map(v => v.c.matrix));
                const pdb = new PdbWriter(merged).getData();
                RelaxationModal.submit(name, type, pdb);
            });
        });

        // TODO The relaxation is temporarily disabled
        button.setText("_____________");
        button.setEnabled(false, "This feature is currently disabled");

        this.add(table, button);
    }

    public dispose(): this {
        super.dispose();
        this.componentsSelect.dispose();
        return this;
    }

    // STATIC ----------------------------------------------------------------------------------------------------------

    //private static readonly URL = /relax_new";
    private static readonly SERVER = new CatanaServer();

    // TODO return something
    private static submit(name: string, type: Type, pdb: string): void {
        this.SERVER.fetchText("relax_new", { name, type, pdb }).then((response) => {
            if (response === null) return;
            console.log("Response to relax_new was: " + response);
        });
    }
}

export default RelaxationModal;