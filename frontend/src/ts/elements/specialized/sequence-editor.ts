import {
    CgMonomerProxy,
    CgPolymer,
    CgStructureComponent,
    ChainProxy,
    Component,
    Representation,
    ResidueProxy,
    StructureComponent
} from "catana-backend";

import CATANA from "../../catana-instance";
import Element, { Callback, CallbackType } from "../element";
import MovableModalBox from "../modal/movable-modal-box";
import Globals from "../../globals";
import Button, { ButtonType } from "../button";
import Panel, { PanelOrientation } from "../panel";
import TextElement from "../text-element";
import Select from "../select";
import TitledPanel from "../complex/titled-panel";
import { IconButton, IconType } from "../icon";
import { ModalBoxLayer } from "../modal/modal-box";

const UTIL = {
    // Collect all the characters that we want to support
    // Put them in an array with no duplicates
    // Source: https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
    ACCEPTED_CHARACTERS: [...new Set<string>((
        CATANA.PROTEIN_VALUES_THREE_LETTER.join("") +
        CATANA.PROTEIN_VALUES_ONE_LETTER.join("") +
        CATANA.DNA_VALUES.join(""))
        .split(""))]
        .reduce((a, b) => a + b.toUpperCase() + b.toLowerCase(), ""),
    ACCEPTED_CHARACTERS_PROTEIN: [...new Set<string>((
        CATANA.PROTEIN_VALUES_THREE_LETTER.join("") +
        CATANA.PROTEIN_VALUES_ONE_LETTER.join(""))
        .split(""))]
        .reduce((a, b) => a + b.toUpperCase() + b.toLowerCase(), ""),
    ACCEPTED_CHARACTERS_DNA: CATANA.DNA_VALUES.reduce((a, b) => a + b.toUpperCase() + b.toLowerCase(), ""),
    RESNAME_DICT: Object.assign({},
        ...CATANA.PROTEIN_VALUES_ONE_LETTER.map((x, i) => ({
            [x]: x, [CATANA.PROTEIN_VALUES_THREE_LETTER[i]]: x
        })),
        ...CATANA.DNA_VALUES.map(x => ({
            [x]: x, ["D" + x]: x
        }))),
    colorHexToCss: hex => new CATANA.Color(hex).getStyle(),
    getAcceptedCharacters: (supportProtein: boolean, supportDna: boolean) => {
        return supportProtein
            ? (supportDna
                ? UTIL.ACCEPTED_CHARACTERS
                : UTIL.ACCEPTED_CHARACTERS_PROTEIN)
            : (supportDna
                ? UTIL.ACCEPTED_CHARACTERS_DNA
                : "");
    }
};

type SequenceType = "protein" | "dna";

export class SequenceEditor extends Element<HTMLDivElement> {// = function(editable=true, pasteEnabled=true, supportProtein=true, supportDna=true) {

    private readonly changeCallbacks: (() => void)[] = [];
    private readonly elementHoveredCallbacks: ((e: SequenceElement) => void)[] = [];
    private readonly elementClickedCallbacks: ((e: SequenceElement) => void)[] = [];

    private editable: boolean;
    private pasteEnabled: boolean;

    private readonly elements: SequenceElement[] = [];
    private elementColorFunction: ((e: SequenceElement) => string);

    private readonly placeholder: TextElement;

    private _remove(start: number, end: number) {
        if (start === end && start > 0) {
            --start;
        }
        if (start !== end) {
            this.remove(start, end - start);
        }
    }

    private _insert(sequence: string, start: number, end: number) {
        if (start !== end) this._remove(start, end);
        const elements = sequence
            .split("")
            .map(x => new SequenceElement(x));
        this.insert(elements, start);
    }

    public constructor(editable: boolean = true, pasteEnabled: boolean = true, supportProtein: boolean = true, supportDna: boolean = true) {
        super(document.createElement("div"));
        this.addClass("SequenceEditor")

        const options = new Panel(); {
            const compSelect = new Select();
            const chainSelect = new Select();
            const reprSelect = new Select();
            options.add(compSelect, chainSelect, reprSelect);
        }

        this.dom.spellcheck = false;

        const accepted = UTIL.getAcceptedCharacters(supportProtein, supportDna);

        this.addCallback(CallbackType.KEYDOWN, (type, src, e: KeyboardEvent) => {
            const key = e.key;
            if (e.ctrlKey || e.metaKey || key.startsWith("Arrow")) {
                if (key === "Home") {
                    this.setCaretPosition(0);
                    e.preventDefault();
                } else if (key == "End") {
                    this.setCaretPosition(this.getSequenceLength());
                    e.preventDefault();
                }
                return; // Keep default behavior
            } else if (this.isEditable() && this.isEnabled()) {
                if (key.length === 1 && accepted.includes(key)) {
                    //const element = new UI.SequenceElement(key.toUpperCase());
                    const start = this.getCaretStartPosition();
                    const end = this.getCaretEndPosition();
                    //if (start !== end) _remove(start, end);
                    //this.insert(element, start);
                    //this.setCaretPosition(start + 1);
                    const insertion = key.toUpperCase();
                    if (start === null || end === null) console.warn("Unable to insert into sequence because 'start' or 'end' were 'null'. Tried to insert: " + insertion);
                    else this._insert(insertion, start, end);
                } else if (key === "Backspace") {
                    const start = this.getCaretStartPosition();
                    const end = this.getCaretEndPosition();
                    if (start === null || end === null) console.warn("Unable to remove from sequence because 'start' or 'end' were 'null'");
                    else this._remove(start, end);
                } else if (key === "Delete") {
                    const start = this.getCaretStartPosition();
                    const end = this.getCaretEndPosition();
                    if (start === null || end === null) console.error("Unable to remove from sequence because 'start' or 'end' were 'null'");
                    else this._remove(start, start === end ? end + 1 : end);
                }
            }
            e.preventDefault();
        });
        this.addCallback(CallbackType.PASTE, (type, src, e: ClipboardEvent) => {
            if (this.editable) {
                const start = this.getCaretStartPosition();
                const end = this.getCaretEndPosition();
                const text = e.clipboardData?.getData("text");
                if (text && this.pasteEnabled) {
                    const dialog = new SequenceProcessorImportDialog(text, supportProtein, supportDna);
                    document.body.appendChild(dialog.dom);
                    this.setEnabled(false);
                    dialog.show().wait().then((sequenceData) => {
                        const sequence = sequenceData.sequence;
                        //const sequenceType = sequenceData.type;
                        if (start === null || end === null) console.error("Unable to insert into sequence because 'start' or 'end' were 'null'. Tried to insert: " + sequence);
                        else this._insert(sequence, start, end);
                        dialog.dispose();
                        this.setEnabled(true);
                    });
                }
            }
            e.preventDefault();
        });

        this.setPasteEnabled(pasteEnabled);
        this.setEditable(editable);
        this.elementColorFunction = () => "";
        this.elements = [];

        this.placeholder = new TextElement().addClass("Placeholder");
        this.setPlaceholder("Sequence");
        this.dom.appendChild(this.placeholder.dom);

        this.setElementColorFunction(this.elementColorFunction);
    }

    private emitChangeEvent() {
        for (const c of this.changeCallbacks) c();
    }

    private emitElementHoveredEvent(e: SequenceElement) {
        for (const c of this.elementHoveredCallbacks) c(e);
    }

    private emitElementClickedEvent(e: SequenceElement) {
        for (const c of this.elementClickedCallbacks) c(e);
    }

    public setPlaceholder(text: string) {
        this.placeholder.setText(text);
        this.placeholder.setVisible(text !== "");
        return this;
    }

    public setEditable(editable: boolean) {
        //this.dom.contentEditable = editable ? "true" : "false";
        this.dom.contentEditable = "true";
        this.editable = editable;
        if (editable) this.addClass("editable");
        else this.removeClass("editable");
        return this;
    }

    public setPasteEnabled(pasteEnabled: boolean) {
        this.pasteEnabled = pasteEnabled;
        return this;
    }

    public isEditable(): boolean {
        return this.editable;
    }

    public setSequence(sequence: string) {
        // TODO may be a good idea to verify here if the sequence is acceptable... like in the 'paste' callback above!
        this.clear();
        this.addSequence(sequence);
        return this;
    }

    public getSequenceLength(): number {
        return this.elements.length;
    }

    public addSequence(sequence: string) {
        this.insert(sequence.split("").map(x => new SequenceElement(x)));
        return this;
    }

    public getSequence(): string {
        //const a = this.elements.map(x => x.getValue());
        return this.elements.reduce((a, b) => a + b.getValue(), "");
    }

    public getValue(): string {
        return this.getSequence();
    }

    public setElementColorFunction(colorFun: null | ((e: SequenceElement) => string)) {
        if (!colorFun) {
            colorFun = () => "";
            //const colormaker = CATANA.ColormakerRegistry.getScheme({scheme: "resname"});
            // Will not work because ResnameColormaker uses three-letter amino acids
            //colorFun = e => colormaker.getColor(e.getValue());
        }
        this.forEachElement(e => e.setColor(colorFun!(e)));
        this.elementColorFunction = colorFun;
        return this;
    }

    public addOnChangeCallback(callback: () => void) {
        this.changeCallbacks.push(callback);
        return this;
    }

    public addOnElementHoveredCallback(callback: (e: SequenceElement) => void) {
        this.elementHoveredCallbacks.push(callback);
        return this;
    }

    public addOnElementClickedCallback(callback: (e: SequenceElement) => void) {
        this.elementClickedCallbacks.push(callback);
        return this;
    }

    public addCallback(types: CallbackType | CallbackType[], fun: Callback): this {
        if (Array.isArray(types) && types.includes(CallbackType.CHANGE)) {
            console.warn("SequenceEditor does not support the 'change' event with 'addCallback'. " +
                "Instead, use 'addOnChangeCallback'");
            return this;
        }
        super.addCallback(types, fun);
        return this;
    }

    public forEachElement(fun: (element: SequenceElement) => void) {
        for (const e of this.elements) fun(e);
        return this;
    }

    public setCaretPosition(position: number) {
        if (position > this.elements.length) position = this.elements.length;
        const elementIndex = position > 0 ? (position - 1) : 0;
        position = position > 0 ? 1 : 0;

        const range = document.createRange();
        const sel = window.getSelection();
        if (!sel || sel.type === "None") return this;

        range.setStart(this.elements.length > 0 ? this.elements[elementIndex].dom : this.dom, position);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
        return this;
    }

    private getCaretPosition(end: boolean): null | number {
        if (this.elements.length === 0) return 0;
        const sel = window.getSelection();
        if (sel && sel.rangeCount === 1) {
            const range = sel.getRangeAt(0);
            let container: Node = end ? range.endContainer : range.startContainer;
            if (container === this.dom) return 0;
            if (container.parentNode !== this.dom) container = container.parentNode as Node; // If container is #text
            const elementIndex = (Array.from(this.dom.children) as Node[]).indexOf(container);
            if (elementIndex === -1) return -1;
            return elementIndex + (end ? range.endOffset : range.startOffset);
        }
        return null;
    }

    public getCaretEndPosition() {
        return this.getCaretPosition(true);
    }

    public getCaretStartPosition() {
        return this.getCaretPosition(false);
    }

    public get selectedElements(): SequenceElement[] {
        let start: number = this.getCaretStartPosition() || 0;
        let end: number = Math.min(this.getCaretEndPosition() || 0, this.elements.length);
        if (end < start) {
            const t = end;
            end = start;
            start = t;
        }
        const selection: SequenceElement[] = [];
        for (let i = start; i < end; ++i) {
            selection.push(this.elements[i]);
        }
        return selection;
    }

    /**
     * These are the most important methods of this class!
     * They define the main behavior: inserting and removing 'SequenceElement's
     */
    public insert(elements: SequenceElement[], position?: number, silent: boolean = false) {
        this.placeholder.orphan();
        if (!Array.isArray(elements)) elements = [elements]; // Ensure that 'elements' is an array
        if (position === undefined) position = this.elements.length;

        const end = position === this.elements.length;
        let i = end ? this.elements.length - 1 : position - 1;
        for (const element of elements) {
            element.setIndex(++i);
            element.addCallback(CallbackType.CLICK, () => this.emitElementClickedEvent(element));
            element.addCallback(CallbackType.MOUSEMOVE, () => this.emitElementHoveredEvent(element));
            element.setColor(this.elementColorFunction(element));
        }

        if (end) {
            // Insert elements at the end
            for (const element of elements) this.dom.appendChild(element.dom);
            this.elements.push(...elements);
            this.setCaretPosition(this.elements.length);
        } else {
            // Insert elements in the middle
            const nextElement = this.elements[position];
            for (const element of elements) nextElement.appendBefore(element);
            this.elements.splice(position, 0, ...elements);
            this.setCaretPosition(position + elements.length);
        }
        for (let i = position + elements.length; i < this.elements.length; ++i) {
            this.elements[i].setIndex(i);
        }
        if (elements.length > 0 && !silent) this.emitChangeEvent();
        if (elements.length === 0) this.dom.appendChild(this.placeholder.dom);
        return this;
    }
    public remove(position: number, howMany: number = 1, silent: boolean = false) {
        this.placeholder.orphan();
        const changed = position < this.elements.length && howMany > 0;
        const end = Math.min(position + howMany, this.elements.length);
        for (let i = position; i < end; ++i) {
            this.elements[i].dispose();
        }
        this.elements.splice(position, howMany);
        for (let i = position; i < this.elements.length; ++i) {
            this.elements[i].setIndex(i);
        }
        this.setCaretPosition(position);
        if (changed && !silent) this.emitChangeEvent();
        if (this.elements.length === 0) this.dom.appendChild(this.placeholder.dom);
        return this;
    }
    public clear(silent: boolean = false) {
        this.placeholder.orphan();
        const changed = this.elements.length > 0;
        for (let i = 0; i < this.elements.length; ++i) {
            this.elements[i].dispose();
        }
        this.elements.length = 0;
        if (changed && !silent) this.emitChangeEvent();
        this.dom.appendChild(this.placeholder.dom);
        return this;
    }
}

export class SimpleSequenceEditor extends Panel {

    private readonly editor: SequenceEditor;

    public constructor(supportProtein: boolean = true, supportDna: boolean = true) {
        super();
        const scope = this;
        this.addClass("SimpleSequenceEditor");
        this.editor = new SequenceEditor(true, true, supportProtein, supportDna)
            .setPlaceholder("Sequence");
        let dialogOpen = false;
        this.add(
            scope.editor,
            new IconButton(IconType.MORE, undefined, ButtonType.MINI)
                .addCallback(CallbackType.CLICK, () => {
                    if (dialogOpen) return;
                    dialogOpen = true;
                    scope.editor.setEnabled(false);
                    const dialog = new SequenceProcessorImportDialog("", supportProtein, supportDna);
                    document.body.appendChild(dialog.dom);
                    dialog.show().wait().then((sequenceData) => {
                        const sequence = sequenceData.sequence;
                        //const sequenceType = sequenceData.type;
                        scope.editor.addSequence(sequence);
                        dialog.dispose();
                        scope.editor.setEnabled(true);
                        dialogOpen = false;
                    });
                })
        );
    }

    public addOnChangeCallback(callback: () => void) {
        this.editor.addOnChangeCallback(callback);
        return this;
    }

    public getValue(): string {
        return this.editor.getValue();
    }

    public setPlaceholder(text: string) {
        this.editor.setPlaceholder(text);
        return this;
    }
}

export class SequenceProcessorImportDialog extends MovableModalBox {

    private readonly importCallbacks: ((sequence: string, type: SequenceType) => void)[];
    private readonly processor: SequenceProcessor;

    public constructor(sequence: string, supportProtein: boolean = true, supportDna: boolean = true, icon?: IconType) {
        super("Import sequence", false, icon);
        this.addClass("Dialog");
        this.layer = ModalBoxLayer.OVERLAY;
        this.processor = new SequenceProcessor(sequence, supportProtein, supportDna);
        const bottomBar = new Panel(PanelOrientation.HORIZONTAL).addClass("DialogBottomBar");
        if (supportProtein) {
            const importP3 = new Button("Import as protein three-letter").addCallback(CallbackType.CLICK, () => {
                const sequence = this.processor.getProtein3sequence();
                for (const c of this.importCallbacks) c(sequence, "protein");
            });
            const importP1 = new Button("Import as protein one-letter").addCallback(CallbackType.CLICK, () => {
                const sequence = this.processor.getProtein1sequence();
                for (const c of this.importCallbacks) c(sequence, "protein");
            });
            bottomBar.add(importP3, importP1);
        }
        if (supportDna) {
            const importDna = new Button("Import as DNA").addCallback(CallbackType.CLICK, () => {
                const sequence = this.processor.getDnaSequence();
                for (const c of this.importCallbacks) c(sequence, "dna");
            });
            bottomBar.add(importDna);
        }
        this.add(this.processor, bottomBar);
        this.importCallbacks = [];
    }

    public wait(): Promise<{ sequence: string, type: SequenceType }> {
        const scope = this;
        return new Promise((resolve) => {
            const _finish = function (sequence, sequenceType) {
                {
                    const index = scope.closeCallbacks.indexOf(closeCallback);
                    if (index !== -1) {
                        scope.closeCallbacks.splice(index, 1);
                    }
                }
                {
                    const index = scope.importCallbacks.indexOf(confirmCallback);
                    if (index !== -1) {
                        scope.importCallbacks.splice(index, 1);
                    }
                }
                resolve({ sequence: sequence, type: sequenceType });
            }

            const closeCallback = () => _finish("", "unknown");
            const confirmCallback = (sequence, sequenceType) => _finish(sequence, sequenceType);

            scope.importCallbacks.push(confirmCallback);
            scope.addOnCloseCallback(closeCallback);
        });
    }

    public clearText() {
        this.processor.clearText();
    }
}

export class SequenceProcessor extends Panel {

    private readonly messageInput: TextElement;
    private readonly messageProtein3: TextElement;
    private readonly messageProtein1: TextElement;
    private readonly messageDna: TextElement;

    private readonly editor1: SequenceEditor;
    private readonly viewerProtein3: SequenceEditor;
    private readonly viewerProtein1: SequenceEditor;
    private readonly viewerDna: SequenceEditor;

    private sequenceProtein3: string = "";
    private sequenceProtein1: string = "";
    private sequenceDna: string = "";

    private readonly supportProtein: boolean;
    private readonly supportDna: boolean;

    public constructor(sequence: string, supportProtein: boolean = true, supportDna: boolean = true) {
        super(PanelOrientation.VERTICAL);
        this.addClass("SequenceProcessor");

        if (!supportProtein && !supportDna) {
            console.error("Something went wrong. Neither protein nor DNA are supported here.");
        }

        const panel_editor1 = new TitledPanel("Input sequence", PanelOrientation.VERTICAL); {
            this.messageInput = new TextElement();
            this.editor1 = new SequenceEditor(true, false, supportProtein, supportDna)
                .addCallback(CallbackType.PASTE, (type, src, e: ClipboardEvent) => {
                    const sequence = this.editor1.getSequence();
                    const pasted = e.clipboardData?.getData("text");
                    const start = this.editor1.getCaretStartPosition();
                    const end = this.editor1.getCaretEndPosition();
                    if (!pasted || start === null || end === null) {
                        console.error("Could not process sequence because 'start', 'end', or 'pasted' have an invalid value. " +
                            "start=" + start + ", end=" + end + ", pasted=" + pasted);
                    } else {
                        const text = sequence.substring(0, start) + pasted + sequence.substring(end);
                        this.process(text);
                        this.editor1.setCaretPosition(start + pasted.length);
                    }
                    e.preventDefault();
                })
                .addOnChangeCallback(() => {
                    const caretPos = this.editor1.getCaretEndPosition();
                    if (caretPos === null) {
                        console.error("Could not process sequence because the caret position was null. Sequence: " + this.editor1.getSequence());
                    } else {
                        this.process();
                        this.editor1.setCaretPosition(caretPos);
                    }
                });
            panel_editor1.add(this.messageInput, this.editor1);
        }

        let panel_protein3, panel_protein1, panel_dna;
        if (supportProtein) {
            panel_protein3 = new TitledPanel("Protein three-letter", PanelOrientation.VERTICAL); {
                this.messageProtein3 = new TextElement();
                this.viewerProtein3 = new SequenceEditor(false, false);
                panel_protein3.add(this.messageProtein3, this.viewerProtein3);
            }
            panel_protein1 = new TitledPanel("Protein one-letter", PanelOrientation.VERTICAL); {
                this.messageProtein1 = new TextElement();
                this.viewerProtein1 = new SequenceEditor(false, false);
                panel_protein1.add(this.messageProtein1, this.viewerProtein1);
            }
        }
        if (supportDna) {
            panel_dna = new TitledPanel("DNA", PanelOrientation.VERTICAL); {
                this.messageDna = new TextElement();
                this.viewerDna = new SequenceEditor(false, false);
                panel_dna.add(this.messageDna, this.viewerDna);
            }
        }

        this.dom.appendChild(panel_editor1.dom);
        if (panel_protein3) this.dom.appendChild(panel_protein3.dom);
        if (panel_protein1) this.dom.appendChild(panel_protein1.dom);
        if (panel_dna) this.dom.appendChild(panel_dna.dom);

        this.supportProtein = supportProtein;
        this.supportDna = supportDna;

        this.process(sequence);
    }

    public getProtein3sequence() {
        return this.sequenceProtein3;
    }

    public getProtein1sequence() {
        return this.sequenceProtein1;
    }

    public getDnaSequence() {
        return this.sequenceDna;
    }

    public process(text?: string) {
        let s = text || this.editor1.getSequence();

        // Remove unaccepted characters (see UI.SequenceEditorUtil.ACCEPTED_CHARACTERS)]
        const accepted = UTIL.getAcceptedCharacters(this.supportProtein, this.supportDna);
        if (accepted.length === 0) console.error("No characters are accepted. This should not have happened.");
        const regexPattern = "[^" + accepted + "]";
        const regex = new RegExp(regexPattern);
        let original_bad = 0;
        const originalSequence_elements: SequenceElement[] = []; {
            for (const c of s.split("")) {
                if (regex.test(c)) { // UNACCEPTABLE
                    ++original_bad;
                    originalSequence_elements.push(new SequenceElement(c).addClass("bad"));
                } else {
                    originalSequence_elements.push(new SequenceElement(c));
                }
            }
        }
        this.editor1.clear(true);
        this.editor1.insert(originalSequence_elements, undefined, true);
        this.messageInput.setText(original_bad + " characters were ignored (marked in red)");

        s = s.replace(new RegExp(regexPattern, "g"), "").toUpperCase();

        if (this.supportProtein) {
            let protein3_bad = 0;
            this.sequenceProtein3 = "";
            const protein3_elements: SequenceElement[] = [];
            { // Three letter
                const extra = s.length % 3;
                for (const aa3 of s.substring(0, s.length - extra).match(/.{3}/g) || []) {
                    if (CATANA.PROTEIN_VALUES_THREE_LETTER.includes(aa3)) {
                        protein3_elements.push(new SequenceElement(aa3[0]));
                        protein3_elements.push(new SequenceElement(aa3[1].toLowerCase()));
                        protein3_elements.push(new SequenceElement(aa3[2].toLowerCase()));

                        const oneLetter = CATANA.threeLetterToOneLetter(aa3);
                        this.sequenceProtein3 += oneLetter;
                    } else {
                        ++protein3_bad;
                        protein3_elements.push(new SequenceElement(aa3[0]).addClass("bad"));
                        protein3_elements.push(new SequenceElement(aa3[1].toLowerCase()).addClass("bad"));
                        protein3_elements.push(new SequenceElement(aa3[2].toLowerCase()).addClass("bad"));
                    }
                }
                for (let j = s.length - extra; j < s.length; ++j) {
                    protein3_elements.push(new SequenceElement(s[j]).addClass("bad"));
                }
            }
            this.viewerProtein3.clear();
            this.viewerProtein3.insert(protein3_elements);
            this.messageProtein3.setText(protein3_bad + " amino acids could not be detected (marked in red)");

            let protein1_bad = 0;
            this.sequenceProtein1 = "";
            const protein1_elements: SequenceElement[] = [];
            { // One letter
                for (const aa1 of s.split("")) {
                    if (CATANA.PROTEIN_VALUES_ONE_LETTER.includes(aa1)) {
                        protein1_elements.push(new SequenceElement(aa1));
                        this.sequenceProtein1 += aa1;
                    } else {
                        ++protein1_bad;
                        protein1_elements.push(new SequenceElement(aa1).addClass("bad"));
                    }
                }
            }
            this.viewerProtein1.clear();
            this.viewerProtein1.insert(protein1_elements);
            this.messageProtein1.setText(protein1_bad + " amino acids could not be detected (marked in red)");
        }

        if (this.supportDna) {
            let dna_bad = 0;
            this.sequenceDna = "";
            const dna_elements: SequenceElement[] = [];
            { // DNA
                for (const nt of s.split("")) {
                    if (CATANA.DNA_VALUES.includes(nt)) {
                        dna_elements.push(new SequenceElement(nt));
                        this.sequenceDna += nt;
                    } else {
                        ++dna_bad;
                        dna_elements.push(new SequenceElement(nt).addClass("bad"));
                    }
                }
            }
            this.viewerDna.clear();
            this.viewerDna.insert(dna_elements);
            this.messageDna.setText(dna_bad + " nucleotides could not be detected (marked in red)");
        }

        return this;
    }

    public clearText(): void {
        this.editor1?.clear(true);
        this.viewerProtein1?.clear(true);
        this.viewerProtein3?.clear(true);
        this.viewerDna?.clear(true);
    }
}

export class SequenceElement extends Element<HTMLSpanElement> {
    private index: number;
    private readonly _sequenceIndex: null | number;

    public constructor(text: string, sequenceIndex?: number) {
        super(document.createElement("span"));
        this.dom.className = "SequenceElement";
        if (text.length > 1) console.warn("Text of SequenceElement should not have more than one character!");
        this.dom.textContent = text;
        this.index = -1;
        this._sequenceIndex = sequenceIndex === undefined ? null : sequenceIndex;
    }

    public getValue(): string {
        return this.dom.textContent || "";
    }

    public setColor(color: string) {
        this.dom.style.background = color || "";
        return this;
    }

    public getIndex(): number {
        return this.index;
    }

    public setIndex(index: number) {
        this.index = index;
        return this;
    }

    public get sequenceIndex(): null | number {
        return this._sequenceIndex;
    }
}

interface Default {
    name: string;
    fun: null | (() => void);
}

interface Defaults {
    comp: Default;
    chain: Default;
    repr: Default;
    type: Default;
}

type ProxyType = ResidueProxy | CgMonomerProxy;

export class SequenceOptionsPanel extends Panel {

    private readonly selComp: Select;
    private readonly selChain: Select;
    private readonly selRepr: Select;
    private readonly selType: Select;

    private readonly defaults: Defaults;

    private comp: Component[] = [];
    private repr: Representation[] = [];

    private sequence: string = "";

    private getProxyFun: null | ((e: SequenceElement) => ProxyType) = null;

    private readonly editor: SequenceEditor;

    public constructor(editor: SequenceEditor, defaults?: Partial<Defaults>) {
        super(PanelOrientation.HORIZONTAL);
        const scope = this;
        this.editor = editor;

        if (!defaults) defaults = {};
        if (!defaults.comp) defaults.comp = { name: "[ component ]", fun: null };
        if (!defaults.chain) defaults.chain = { name: "[ chain ]", fun: null };
        if (!defaults.repr) defaults.repr = { name: "[ representation ]", fun: null };
        if (!defaults.type) defaults.type = { name: "[ type ]", fun: null };
        this.defaults = defaults as Defaults;

        this.selComp = new Select();
        this.selChain = new Select();
        this.selRepr = new Select();
        this.selType = new Select({
            unknown: defaults.type.name,
            protein: "Protein",
            dna: "DNA"
        });

        Globals.stage?.signals.componentAdded.add(c => {
            c.signals.representationAdded.add(r => {
                if (scope.getComponent() === c) scope.updateRepresentations();
            });
            c.signals.representationRemoved.add(r => {
                if (scope.getComponent() === c) scope.updateRepresentations();
            });
            scope.updateComponents();
        });
        Globals.stage?.signals.componentRemoved.add(c => {
            scope.updateComponents();
        });

        this.selComp.addCallback(CallbackType.CHANGE, () => {
            scope.updateRepresentations(false);
            scope.updateChains();
            scope.selType.setEnabled(!scope.getComponent());
        });
        this.selChain.addCallback(CallbackType.CHANGE, () => scope.updateSequence());
        this.selRepr.addCallback(CallbackType.CHANGE, () => scope.updateColors());
        this.selType.addCallback(CallbackType.CHANGE, () => scope.updateColors());

        scope.updateComponents();

        this.dom.appendChild(this.selComp.dom);
        this.dom.appendChild(this.selChain.dom);
        this.dom.appendChild(this.selRepr.dom);
        this.dom.appendChild(this.selType.dom);
    }

    private updateComponents() {
        const selected = this.getComponent();
        const oComp = [this.defaults.comp.name];
        this.comp = [];
        let index = 0;
        Globals.stage?.eachComponent((c: Component) => {
            switch (c.type) {
                case "structure":
                case "cg-structure":
                    if (selected === c) index = oComp.length;
                    this.comp.push(c);
                    oComp.push(c.name);
                    break;
            }
        });
        this.selComp.updateOptions(oComp);
        this.selComp.setSelectedIndex(index);
        this.updateRepresentations(false);
        this.updateChains();
        if (index === 0 && this.defaults.comp.fun) this.defaults.comp.fun();
    }

    private updateChains() {
        const c = this.getComponent();
        const oChain: string[] = [];
        if (c) {
            switch (c.type) {
                case "structure":
                    (c as StructureComponent).structure.eachChain((chainProxy: ChainProxy) => {
                        const chainname = chainProxy.chainname;
                        if (!oChain.includes(chainname)) oChain.push(chainname);
                    });
                    break;
                case "cg-structure":
                    (c as CgStructureComponent).cgStructure.forEachPolymer((pol: CgPolymer) => {
                        const name = pol.name;
                        if (!oChain.includes(name)) oChain.push(name);
                    });
                    break;
            }
        }
        const valid = oChain.length > 0;
        this.selChain.setEnabled(valid);
        if (!valid) oChain.push(this.defaults.chain.name);
        this.selChain.updateOptions(oChain);
        this.selChain.setSelectedIndex(0);
        this.updateSequence();
    }

    private updateRepresentations(updateColors: boolean = true) {
        const selected = this.getRepresentation();
        const oRepr = [this.defaults.repr.name];
        this.repr = [];
        let index = 0;
        const c = this.getComponent();
        if (c) {
            c.eachRepresentation(reprElem => {
                const repr = reprElem.repr;
                if (selected === repr) index = oRepr.length;
                this.repr.push(repr);
                oRepr.push(repr.type);
            });
        }
        this.selRepr.setEnabled(c !== null);
        this.selRepr.updateOptions(oRepr);
        this.selRepr.setSelectedIndex(index);
        this.updateColors();
        if (index === 0 && this.defaults.repr.fun) this.defaults.repr.fun();
    }

    private updateSequence() {
        const c = this.getComponent();

        if (c) { // A component is selected
            if (this.editor.isEditable()) this.sequence = this.editor.getSequence();
            this.editor.setEditable(false);

            const elements: SequenceElement[] = [];

            if (c instanceof StructureComponent) {
                const chainname = this.chainName;
                let foundChainProxy = false;
                const indexMap = {};
                c.structure.eachChain((chainProxy) => {
                    if (foundChainProxy || chainname !== chainProxy.chainname) return;
                    foundChainProxy = true;
                    let i = -1;
                    chainProxy.eachResidue((residueProxy) => {
                        const resname_ngl = residueProxy.resname;
                        const resname = UTIL.RESNAME_DICT[resname_ngl];
                        if (!resname) {
                            // TODO handle better...
                            console.error("Unexpected resname " + resname_ngl + ". Skipping...");
                            return;
                        }
                        //const resno = residueProxy.resno; // Residue number
                        const element = new SequenceElement(resname, residueProxy.resno);
                        elements.push(element);
                        //scope.indexMap[i] = residueProxy.index;
                        indexMap[++i] = residueProxy.index;
                    });
                });
                this.getProxyFun = e => c.structure.getResidueProxy(indexMap[e.getIndex()]);
            } else if (c instanceof CgStructureComponent) {
                const chainname = this.chainName;
                let foundPolymer = false;
                const proxyMap = {};
                c.cgStructure.forEachPolymer(pol => {
                    if (foundPolymer || pol.name !== chainname) return;
                    foundPolymer = true;
                    let i = -1;
                    pol.forEachMonomer(mp => { // Monomer proxy
                        const resname = UTIL.RESNAME_DICT[mp.residueName];
                        const element = new SequenceElement(resname, mp.residueNumber);
                        elements.push(element);
                        //scope.indexMap[i] = mp.index;
                        proxyMap[++i] = mp;
                    });
                });
                this.getProxyFun = e => proxyMap[e.getIndex()];
            } else {
                console.error("Unexpected Component type when updating sequence in SequenceEditor: " + c.type);
                return;
            }

            this.editor.clear();
            this.updateColors();
            this.editor.insert(elements);

        } else { // No component is selected
            if (this.editor.isEditable()) return;
            this.editor.setEditable(true);
            this.updateColors();
            this.editor.setSequence(this.sequence);
            //scope.indexMap = {};
            this.getProxyFun = null;
        }
    }

    private updateColors() {
        let _getColor: null | ((e: SequenceElement) => string) = null;
        const c = this.getComponent();
        if (c) {
            const r = this.getRepresentation();
            if (r) {
                const colormaker = CATANA.ColormakerRegistry.getScheme(r.getColorParams());
                switch (c.type) {
                    case "structure":
                        _getColor = e => UTIL.colorHexToCss(colormaker.atomColor(this.getProxyFromElement(e)));
                        break;
                    case "cg-structure":
                        _getColor = e => UTIL.colorHexToCss(colormaker.monomerColor(this.getProxyFromElement(e)));
                        break;
                    default:
                        console.error("Unexpected Component type " + c.type + ". Using default color scheme...");
                        break;
                }
            }
        } else {
            const type = this.getType() || "unknown";
            let accepted: null | string[] = null;
            let _convert: null | ((x: string) => string) = null;
            switch (type) {
                case "protein":
                    accepted = CATANA.PROTEIN_VALUES_ONE_LETTER;
                    _convert = x => CATANA.oneLetterToThreeLetter(x)!;
                    break;
                case "dna":
                    accepted = CATANA.DNA_VALUES;
                    _convert = x => x;
                    break;
                default: // Unknown
                    //accepted = UI.SequenceEditorUtil.ACCEPTED_CHARACTERS;
                    break;
            }
            if (accepted && _convert) {
                const colormaker = CATANA.ColormakerRegistry.getScheme({ scheme: "resname" });
                const a = accepted;
                const _c = _convert;
                _getColor = e => {
                    const value = e.getValue();
                    const good = a.includes(value);
                    const resname = _c(value);
                    return good
                        ? UTIL.colorHexToCss(colormaker.atomColor({ resname: resname }))
                        : "";
                };
            }
        }

        this.editor.setElementColorFunction(_getColor);
    }

    public getComponent(): null | Component {
        const index = this.selComp.getSelectedIndex() - 1;
        if (index < 0) return null;
        return this.comp[index];
    }

    public get chainName(): null | string {
        return this.selChain.isEnabled() ? this.selChain.getValue() : null;
    }

    public getRepresentation(): null | Representation {
        const index = this.selRepr.getSelectedIndex() - 1;
        if (index < 0) return null;
        return this.repr[index];
    }

    public getType(): null | string {
        return this.selType.isEnabled() ? this.selType.getValue() : null;
    }

    public getProxyFromElement(element: SequenceElement): ProxyType | null {
        const c = this.getComponent();
        if (c && this.getProxyFun) {
            switch (c.type) {
                case "structure":
                case "cg-structure":
                    return this.getProxyFun(element) || null;
                default:
                    console.error("Unexpected Component type " + c.type + " when retrieving proxy");
            }
        }

        return null;
    }
}