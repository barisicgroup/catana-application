import ModalBox from "./modal-box";
import CATANA from "../../catana-instance";
import Element, { CallbackType } from "../element";
import Globals from "../../globals";
import TextElement from "../text-element";
import { IconButton, IconType } from "../icon";
import { SequenceEditor } from "../specialized/sequence-editor";
import TabsMenu from "../complex/tabs-menu";
import Panel, { PanelOrientation } from "../panel";

export class CreateStructureModal extends ModalBox {
    public constructor(icon?: IconType) {
        super("Create Structure", false, icon);

        this.add(new TabsMenu()
            .addTab("DNA", this.getDnaElement())
            .addTab("Peptide", this.getProteinElement())
        );
    }

    private getDnaElement(): Element {
        const [seqEditor, panel] = this.getElementBase("Input DNA sequence:", true);

        const createSsDnaButton = new IconButton(
            IconType.CREATE_DNA_SS, " Create ssDNA")
            .addCallback(CallbackType.CLICK, (type, e) => {
                let sequence = seqEditor.getSequence();
                CATANA.addComponentFromSequence(sequence, Globals.stage!, { dnaDoubleStranded: false, compType: "dna" });
            });

        const createDsDnaButton = new IconButton(
            IconType.CREATE_DNA_DS, " Create dsDNA")
            .addCallback(CallbackType.CLICK, (type, e) => {
                let sequence = seqEditor.getSequence();
                CATANA.addComponentFromSequence(sequence, Globals.stage!, { dnaDoubleStranded: true, compType: "dna" });
            });

        panel.add(createSsDnaButton, createDsDnaButton);
        return panel;
    }

    private getProteinElement(): Element {
        const [seqEditor, panel] = this.getElementBase("Input one-letter amino acid sequence:", false);

        const createPeptideButton = new IconButton(
            IconType.PLUS, " Create peptide")
            .addCallback(CallbackType.CLICK, (type, e) => {
                let sequence = seqEditor.getSequence();
                CATANA.addComponentFromSequence(sequence, Globals.stage!, { compType: "protein" });
            });

        panel.add(
            new TextElement("Note: The outcome of this procedure is a crude approximation of the peptide structure."),
            new TextElement("For more accurate approach, use the prediction feature of Catana."),
            createPeptideButton);
        return panel;
    }

    private getElementBase(label: string, isDna?: boolean): [SequenceEditor, Panel] {
        const text = new TextElement(label);
        const seqEditor = new SequenceEditor(true, true, !isDna, isDna);
        const panel = new Panel(PanelOrientation.VERTICAL);

        panel.add(text, seqEditor);

        return [seqEditor, panel];
    }
}

export default CreateStructureModal;