import {
    CgMonomerProxy,
    CgPolymer,
    CgStructureComponent,
    ColormakerRegistry,
    Component,
    FastaSequenceProvider,
    Log,
    Representation,
    RepresentationElement,
    ResidueProxy,
    StructureComponent,
    threeLetterToOneLetter
} from "catana-backend";

import Panel, {PanelOrientation} from "../../panel";
import Select from "../../select";
import {SequenceEditor, SequenceElement, SequenceProcessorImportDialog} from "../sequence-editor";
import CATANA from "../../../catana-instance";
import Element, {CallbackType} from "../../element";
import Table, {TableType} from "../../complex/table";
import Icon, {IconButton, IconType} from "../../icon";
import TextElement from "../../text-element";
import Globals from "../../../globals";
import Checkbox from "../../checkbox";
import Button from "../../button";

type FilterObject = { c: Component, r: RepresentationElement, f: string };

function colorHexToCss(hex: number): string {
    return new CATANA.Color(hex).getStyle();
}

interface _Proxy {
    resname?: string;
    resno?: number;
    residueName?: string;
    residueNumber?: number;
    x: number;
    y: number;
    z: number;
}

class Proxy {
    private _proxy: _Proxy;
    constructor(proxy: _Proxy) {
        this._proxy = proxy;
    }
    get resname(): string {
        return this._proxy.resname || this._proxy.residueName || "";
    }
    get resno(): number {
        return this._proxy.resno || this._proxy.residueNumber || -1;
    }
    get x(): number { return this._proxy.x; }
    get y(): number { return this._proxy.y; }
    get z(): number { return this._proxy.z; }
    get proxy(): _Proxy { return this._proxy; }
}

class ComponentSequence extends Panel {
    private readonly setStrandSeqDefText = "Set strand sequence";

    private readonly component: StructureComponent | CgStructureComponent;

    private readonly chainSelect: Select;
    private readonly representationSelect: Select;
    private readonly text: TextElement;
    private readonly locateOnClickCheckbox: Checkbox;
    private readonly editor: SequenceEditor;
    private readonly setSequenceButton: Button;
    private readonly seqImportDialog: SequenceProcessorImportDialog;

    private representations: { [name: string]: Representation } = {};
    private polymer: null | CgPolymer = null;

    private readonly refreshedCallback: () => void;

    public constructor(_c: Component) {
        super(PanelOrientation.VERTICAL);
        this.addClass("ComponentSequencePanel");

        const c = ComponentSequence.ensureSupported(_c);
        if (!c) {
            console.warn("Component not supported for ComponentSequence panel. Component name: " + _c.name);
            this.setEnabled(false, "This component does not support sequence features.");
            return;
        }
        this.component = c;

        // Create selects
        this.representationSelect = new Select().addCallback(CallbackType.CHANGE, () => {
            this.updateColors();
        });
        this.updateRepresentations();
        this.chainSelect = new Select().addCallback(CallbackType.CHANGE, () => {
            this.updateSequence();
        });
        this.updateChains();

        // Create and assemble table
        const optionsTable = new Table<[Icon, Element]>(2, TableType.FORM, false, false, [0, 1]);
        optionsTable.addRow([new Icon(IconType.COLORING), this.representationSelect]);
        optionsTable.addRow([new Icon(IconType.CONNECT), this.chainSelect]); // TODO new icon?

        // Create other elements
        this.text = new TextElement("-").addClass("EditorText");
        this.locateOnClickCheckbox = new Checkbox(false);
        const locateOnClickPanel = new Panel(PanelOrientation.HORIZONTAL).add(
            this.locateOnClickCheckbox, new TextElement("Click on sequence to locate residue"));

        // Create sequence import dialog
        this.seqImportDialog = new SequenceProcessorImportDialog("", false, true, IconType.SET_STRAND_SEQUENCE);
        document.body.appendChild(this.seqImportDialog.dom);

        // Create set sequence button
        this.setSequenceButton = new IconButton(IconType.SET_STRAND_SEQUENCE, this.setStrandSeqDefText);
        this.setSequenceButton.addCallback(CallbackType.CLICK, () => {
            this.seqImportDialog.show().wait().then((sequenceData) => {
                if (this.polymer && sequenceData.sequence.length > 0) {
                    const seqProv = new FastaSequenceProvider(sequenceData.sequence);
                    let seqArr: any[] = [];

                    for (let i = 0; i < sequenceData.sequence.length; ++i) {
                        seqArr.push(seqProv.get(i));
                    }

                    this.polymer.setSequence(seqArr);
                    _c.updateRepresentations({});

                    this.seqImportDialog.hide();

                    Log.info("Sequence changed");
                }

                this.seqImportDialog.clearText();
            });
        });

        // Create editor
        this.editor = this.createEditor();

        // Set up signals
        const s = c instanceof StructureComponent ? c.structure : c.cgStructure;
        this.refreshedCallback = () => {
            this.updateChains();
            this.updateSequence();
        }
        s.signals.refreshed.add(this.refreshedCallback);

        // Wrap up and assemble everything
        this.updateSequence();

        let elems: Element<HTMLElement>[] = [optionsTable, locateOnClickPanel];

        if (_c instanceof CgStructureComponent) {
            elems.push(this.setSequenceButton);
        }

        const scrollableContent = new Panel(PanelOrientation.VERTICAL)
            .add(...elems, this.editor);
        this.add(scrollableContent, this.text);
    }

    public static ensureSupported(c: Component): null | StructureComponent | CgStructureComponent {
        return c instanceof StructureComponent || c instanceof CgStructureComponent ? c : null;
    }

    private static createSequenceElement(p: ResidueProxy | CgMonomerProxy): null | SequenceElement {
        const resname = p instanceof ResidueProxy ? p.resname : p.residueName;
        const name = ComponentSequence.toOneLetter(resname);
        if (!name) {
            // TODO handle this some other way?
            console.error("Could not convert residue (" + resname + ") to one-letter. Skipping...");
            return null;
        }
        return new SequenceElement(name, p.index);
    }

    private getProxy(e: SequenceElement): null | Proxy {
        if (this.component instanceof StructureComponent) {
            //return new Proxy(new AtomProxy(this.component.structure, e.sequenceIndex!));
            return new Proxy(new ResidueProxy(this.component.structure, e.sequenceIndex!));
        } else { //if (this.component instanceof CgStructureComponent) {
            if (this.polymer) {
                const proxy = this.polymer.proxyAtIndex(e.sequenceIndex!);
                if (proxy) return new Proxy(proxy);
            }
        }
        return null;
    }

    public dispose(): this {
        const c = this.component;
        const s = c instanceof StructureComponent ? c.structure : c.cgStructure;
        s.signals.refreshed.remove(this.refreshedCallback);
        this.seqImportDialog.dispose();
        super.dispose();

        return this;
    }

    public updateRepresentations(): void {
        if (!this.component) return;

        const currentRepresentation: null | Representation = this.representations[this.representationSelect.getValue()];
        let currentNewName: null | string = null;

        const representations: { [name: string]: Representation } = {};
        const map: { [reprName: string]: number } = {};
        this.component.reprList.forEach((reprElem, i) => {
            let name = reprElem.name;

            // Ensure that representation names aren't repeated
            if (map[name]) {
                const num = ++map[name];
                if (num === 2) {
                    const newName = name + 1;
                    representations[newName] = representations[name];
                    if (name === currentNewName) currentNewName = newName;
                    delete representations[name];
                    name = name + 2;
                } else {
                    name = name + num;
                }
            } else {
                map[name] = 1;
            }

            representations[name] = reprElem.repr;
            if (reprElem.repr === currentRepresentation) currentNewName = name;
        });
        this.representations = representations;

        const options = ["[ select representation ]", ...Object.keys(this.representations)];
        this.representationSelect.updateOptions(options);
        const index = currentNewName === null ? 0 : (options.indexOf(currentNewName));
        this.representationSelect.setSelectedIndex(index === -1 ? 0 : index);
        if (currentRepresentation !== this.representations[this.representationSelect.getValue()]) this.updateColors();
    }

    private updateChains() {
        const chains: string[] = [];
        if (this.component instanceof StructureComponent) {
            this.component.structure.eachChain((cp) => {
                chains.push(cp.chainname);
            })
        } else { //if (this.component instanceof CgStructureComponent) {
            this.component.cgStructure.forEachPolymer((p) => {
                chains.push(p.name);
            })
        }
        const value = this.chainSelect.getValue();
        const index = chains.indexOf(value);
        this.chainSelect.updateOptions(chains);
        this.chainSelect.setSelectedIndex(Math.max(0, index));
    }

    public updateColors() {
        if (!this.component) return;

        if (this.representationSelect.getSelectedIndex() === 0) {
            this.editor.setElementColorFunction(null);
            return;
        }

        const reprName = this.representationSelect.getValue();
        const r = this.representations[reprName];
        if (!r) return;

        const colormaker = ColormakerRegistry.getScheme(r.getColorParams());
        if (this.component instanceof StructureComponent) {
            this.editor.setElementColorFunction(e => {
                return colorHexToCss(colormaker.atomColor(this.getProxy(e)?.proxy));
            });

        } else {
            if (this.polymer === null) {
                this.editor.setElementColorFunction(null);
                return;
            }
            this.editor.setElementColorFunction(e => {
                const proxy = this.getProxy(e);
                if (proxy === null) return "";
                return colorHexToCss(colormaker.monomerColor(proxy.proxy));
            });
        }
    }

    private static toOneLetter(resname: string): null | string {
        resname = resname.toUpperCase();
        if (resname.length === 2 && resname.charAt(0) === "D") return resname.charAt(1);
        return threeLetterToOneLetter(resname);
    }

    private updateSequence() {
        const chain = this.chainSelect.getValue();
        const elements: SequenceElement[] = [];
        this.polymer = null;

        if (this.component instanceof StructureComponent) {
            this.component.structure.eachChain((cp) => {
                if (elements.length !== 0) return;
                if (cp.chainname === chain) {
                    cp.eachResidue((rp) => {
                        const e = ComponentSequence.createSequenceElement(rp);
                        if (e) elements.push(e);
                    });
                }
            });

        } else { //if (c instanceof CgStructureComponent) {
            this.component.cgStructure.forEachPolymer((p) => {
                if (elements.length !== 0) return;
                if (p.name === chain) {
                    p.forEachMonomer((mp) => {
                        const e = ComponentSequence.createSequenceElement(mp);
                        if (e) elements.push(e);
                    });
                    this.polymer = p;
                }
            });

            // We have to do the "as CgPolymer" conversion otherwise TypeScript seems to think this.polymer is of type "never"
            if (this.polymer && (this.polymer as CgPolymer).isNucleic()) {
                this.setSequenceButton.setEnabled(true);
                this.setSequenceButton.setText(this.setStrandSeqDefText + ` (${(this.polymer as any).isScaffold ? "scaffold" : "staple"})`);
            } else {
                this.setSequenceButton.setEnabled(false);
            }
        }

        this.editor.clear();
        this.editor.insert(elements);
        this.updateColors();
    }

    private getSelectionObjects(resno: number): FilterObject[] {
        const chain = this.chainSelect.getValue();
        const filter = ":" + chain + " AND " + resno;
        const objs: FilterObject[] = [];
        this.component.eachRepresentation(reprElem => {
            objs.push({ c: this.component, r: reprElem, f: filter });
        });
        return objs;
    }

    private createEditor(): SequenceEditor {
        let supportProtein: boolean = false;
        let supportNa: boolean = false;
        if (this.component instanceof StructureComponent) {
            // TODO check if structure is protein or nucleid
        } else { //if (c instanceof CgStructureComponent) {
            for (const p of this.component.cgStructure.polymers) {
                if (p.isNucleic()) supportNa = true;
                else if (p.isProtein()) supportProtein = true;
                if (supportProtein && supportNa) break;
            }
        }

        let highlighted: null | SequenceElement = null;
        const unselect = () => {
            // Undo highlighting
            if (highlighted) highlighted.setHighlighted(false);
            highlighted = null;
            this.text.setText("-");
            this.text.setHighlighted(false);
            Globals.stage.viewer.unselect();
        };

        return new SequenceEditor(false, false, supportProtein, supportNa)
            .addOnElementHoveredCallback((e) => {
                // Undo highlighting
                unselect();

                // Get proxy
                const proxy = this.getProxy(e);
                if (!proxy) return;

                // Do highlighting
                this.text.setText("Residue Num.: " + proxy.resno + " | " + "Name: " + proxy.resname);
                this.text.setHighlighted(true);
                highlighted = e;
                highlighted.setHighlighted(true);
                Globals.stage.viewer.selectFiltered(...this.getSelectionObjects(proxy.resno));
            })
            .addOnElementClickedCallback(e => {
                if (!this.locateOnClickCheckbox.isChecked()) return;
                const proxy = this.getProxy(e);
                if (!proxy) return;
                const position = new CATANA.Vector3(proxy.x, proxy.y, proxy.z);
                Globals.stage?.animationControls.move(position);
            })
            .addCallback(CallbackType.MOUSELEAVE, () => {
                unselect();
            });
    }
}

export default ComponentSequence;