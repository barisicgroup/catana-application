import { CatanaState, CgRemoveState, DirectionSelectorCircle, ProteinRemoveState, CgStructureElementType, StructureElementType } from "catana-backend";

import Panel, { PanelOrientation } from "../panel";
import Slider from "../slider";
import Element, { Callback, CallbackType } from "../element";
import Select from "../select";
import { SimpleSequenceEditor } from "./sequence-editor";
import TextElement from "../text-element";
import RadioGroupPanel from "../complex/radio-group.panel";
import Input from "../input";
import Button from "../button";
import CATANA from "../../catana-instance";
import { IconText, IconType } from "../icon";
import {SimpleFormTable} from "../complex/table";
import Checkbox from "../checkbox";

class ModellingOptionsPanel extends Panel {

    private readonly selectAminoAcidName: Select;
    private readonly inputAminoAcidName: SimpleSequenceEditor;
    private readonly fieldNucleotideName: Select;
    private readonly labelName: TextElement;
    private readonly panelName: Panel;
    private readonly fieldAminoAcidTerminus: RadioGroupPanel;
    private readonly fieldNucleotideDirectionality: RadioGroupPanel;
    private readonly labelTerminus: TextElement;
    private readonly panelTerminus: Panel;
    private readonly labelCount: TextElement;
    private readonly fieldCount: Input;
    private readonly panelDirectionSelectorCircle: DirectionSelectorCirclePanel;
    private readonly button: Button;
    private readonly cgRemovalType: RadioGroupPanel;
    private readonly aaRemovalType: RadioGroupPanel;
    private readonly labelChangeComplement: TextElement;
    private readonly changeComplementCheckbox: Checkbox;
    private readonly labelExtendDoubleStrand: TextElement;
    private readonly extendDoubleStrand: Checkbox;

    private state: null | CatanaState;

    public constructor(directionSelectorCircle: DirectionSelectorCircle) {
        super(PanelOrientation.VERTICAL);
        this.addClass("DesignOptionsPanel");

        // Panel NAME (to select/input an amino acid or nucleotide)
        {
            // TODO We should reuse definitions we already have in the codebase somewhere
            const aminoAcids = ["ala", "arg", "asn", "asp", "cys", "gln", "glu", "gly", "his", "ile", "leu", "lys", "met",
                "phe", "pro", "sec", "ser", "thr", "trp", "tyr", "val"];
            console.assert(aminoAcids.length === 21);
            for (let i = 0; i < aminoAcids.length; ++i) aminoAcids[i] = aminoAcids[i].toUpperCase();
            this.selectAminoAcidName = new Select(aminoAcids);
            //this.inputAminoAcidName = new UI.Input("", "", "ALA, HIS, CYS, ...");
            this.inputAminoAcidName = new SimpleSequenceEditor(true, false);
            this.inputAminoAcidName.addOnChangeCallback(() => this.panelDirectionSelectorCircle.update());

            const nucleotides = ["A", "T", "G", "C", "U"];
            console.assert(nucleotides.length === 5);
            for (let i = 0; i < nucleotides.length; ++i) nucleotides[i] = nucleotides[i].toUpperCase();
            this.fieldNucleotideName = new Select(nucleotides);

            this.labelName = new TextElement("");
            this.panelName = new Panel(PanelOrientation.HORIZONTAL)
                .add(this.selectAminoAcidName, this.inputAminoAcidName, this.fieldNucleotideName);
        }

        // Panel TERMINUS (to select the terminus (5'/3', N/C)
        this.fieldAminoAcidTerminus = new RadioGroupPanel(["N", "C"], 0);
        this.fieldNucleotideDirectionality = new RadioGroupPanel(["5'", "3'"], 0);
        this.labelTerminus = new TextElement("");
        this.panelTerminus = new Panel().add(this.fieldAminoAcidTerminus, this.fieldNucleotideDirectionality);

        // Panel COARSE-GRAINED STRUCTURE REMOVAL (to select type of removal)
        const cgRemTypes: [string, CgStructureElementType][] = [["Monomer / monomer bond", StructureElementType.RESIDUE], ["Chain", StructureElementType.CHAIN]];
        this.cgRemovalType = new RadioGroupPanel(cgRemTypes.map(x => x[0]), 0);
        this.cgRemovalType.addCallback(CallbackType.CHANGE, () => {
            const selIdx = this.cgRemovalType.getSelectedIndex();
            if (this.state && this.state instanceof CgRemoveState && selIdx !== null) {
                this.state.removalType = cgRemTypes[selIdx][1];
            }
        });

        // Panel ALL-ATOM STRUCTURE REMOVAL (to select type of removal)
        const aaRemTypes: [string, StructureElementType][] = [["Atom", StructureElementType.ATOM], ["Residue", StructureElementType.RESIDUE], ["Chain", StructureElementType.CHAIN]];
        this.aaRemovalType = new RadioGroupPanel(aaRemTypes.map(x => x[0]), 1);
        this.aaRemovalType.addCallback(CallbackType.CHANGE, () => {
            const selIdx = this.aaRemovalType.getSelectedIndex();
            if (this.state && this.state instanceof ProteinRemoveState && selIdx !== null) {
                this.state.removalType = aaRemTypes[selIdx][1];
            }
        });

        this.panelTerminus.add(this.cgRemovalType, this.aaRemovalType);

        // Panel COUNT (to select/input how many amino acids or nucleotides should be added
        this.labelCount = new TextElement("Count:");
        this.fieldCount = new Input("1");

        // Complementary nucleotide change UI elements
        this.labelChangeComplement = new TextElement("Modify also paired nucleotide");
        this.changeComplementCheckbox = new Checkbox(true);

        // Strand extension UI elements
        this.labelExtendDoubleStrand = new TextElement("Extend double strand");
        this.extendDoubleStrand = new Checkbox(false);

        this.panelDirectionSelectorCircle = new DirectionSelectorCirclePanel(directionSelectorCircle);

        // Table
        const table = new SimpleFormTable();
        table.addRow([this.labelName, this.panelName]);
        table.addRow([this.labelTerminus, this.panelTerminus]);
        table.addRow([this.labelCount, this.fieldCount]);
        table.addRow([this.labelChangeComplement, this.changeComplementCheckbox]);
        table.addRow([this.labelExtendDoubleStrand, this.extendDoubleStrand]);

        this.state = null;

        this.button = new Button("");
        this.button.addCallback(CallbackType.CLICK, () => {
            if (this.state instanceof CATANA.ProteinAddAminoAcidsState) {
                this.state.add();
            } else if (this.state instanceof CATANA.CgNucleicAcidExtendState) {
                this.state.extend();
            } else {
                console.warn("DesignOptionsPanel button clicked with invalid state (see state below)");
                console.warn(this.state);
            }
        });

        this.add(table, this.panelDirectionSelectorCircle, this.button);
    }

    public setButtonText(text: string) {
        this.button.setText(text);
    }

    public getAminoAcidSequence(overrideState?: "add" | "mutate") {
        if (overrideState !== "mutate" && (this.state instanceof CATANA.ProteinAddAminoAcidsState || overrideState === "add")) {
            const oneLetter = this.inputAminoAcidName.getValue();
            return CATANA.oneLetterToThreeLetter(oneLetter);
        } else if (this.state instanceof CATANA.ProteinMutateAminoAcidState || overrideState === "mutate") {
            return this.selectAminoAcidName.getValue();
        } else {
            return null;
        }
    }

    public getAminoAcidTerminus(): "N" | "C" {
        return this.fieldAminoAcidTerminus.getValue() as "N" | "C";
    }

    public getNucleotideName() {
        return this.fieldNucleotideName.getValue();
    }

    public getNucleotideDirectionality(): "5'" | "3'" {
        return this.fieldNucleotideDirectionality.getValue() as "5'" | "3'";
    }

    public getSelectedCgRemovalType(): CgStructureElementType | undefined {
        const selIdx = this.cgRemovalType.getSelectedIndex();
        return selIdx !== null ? ((selIdx + 1) as CgStructureElementType) : undefined;
    }

    public getSelectedAaRemovalType(): StructureElementType | undefined {
        const selIdx = this.aaRemovalType.getSelectedIndex();
        return selIdx !== null ? (selIdx as StructureElementType) : undefined;
    }

    public getCount(): number {
        return parseInt(this.fieldCount.getValue());
    }

    public getChangeComplBaseState(): boolean {
        return this.changeComplementCheckbox.isChecked();
    }

    public getExtendDoubleStrandState(): boolean {
        return this.extendDoubleStrand.isChecked();
    }

    public addAminoAcidNameCallback(callback: Callback) {
        this.selectAminoAcidName.addCallback(CallbackType.CHANGE, callback);
        this.inputAminoAcidName.addOnChangeCallback(() => callback(CallbackType.CHANGE, this.inputAminoAcidName));
    }

    public addAminoAcidTerminusCallback(callback: Callback) {
        this.fieldAminoAcidTerminus.addCallback(CallbackType.CHANGE, callback);
    }

    public addNucleotideNameCallback(callback: Callback) {
        this.fieldNucleotideName.addCallback(CallbackType.CHANGE, callback);
    }

    public addNucleotideDirectionalityCallback(callback: Callback) {
        this.fieldNucleotideDirectionality.addCallback(CallbackType.CHANGE, callback);
    }

    public addCountCallback(callback: Callback) {
        this.fieldCount.addCallback(CallbackType.INPUT, callback);
    }

    public addComplBaseChangeCallback(callback: Callback) {
        this.changeComplementCheckbox.addCallback(CallbackType.CHANGE, callback);
    }

    public addExtendDoubleStrandCallback(callback: Callback) {
        this.extendDoubleStrand.addCallback(CallbackType.CHANGE, callback);
    }

    public setState(state: CatanaState | null) {
        this.state = state;

        this.labelName.setVisible(false);
        this.panelName.setVisible(false);
        this.selectAminoAcidName.setVisible(false);
        this.inputAminoAcidName.setVisible(false);
        this.fieldNucleotideName.setVisible(false);

        this.labelTerminus.setVisible(false);
        this.panelTerminus.setVisible(false);
        this.fieldAminoAcidTerminus.setVisible(false);
        this.fieldNucleotideDirectionality.setVisible(false);

        this.labelCount.setVisible(false);
        this.fieldCount.setVisible(false);

        this.panelDirectionSelectorCircle.setVisible(false);
        this.button.setVisible(false);

        this.cgRemovalType.setVisible(false);
        this.aaRemovalType.setVisible(false);

        this.labelChangeComplement.setVisible(false);
        this.changeComplementCheckbox.setVisible(false);

        this.labelExtendDoubleStrand.setVisible(false);
        this.extendDoubleStrand.setVisible(false);

        // So that the children element already have some size
        // This is necessary so that the DirectionSelectorCircle is drawn
        this.setVisible(true);

        if (state instanceof CATANA.ProteinAddAminoAcidsState) {
            this.labelName.setVisible(true);
            this.labelName.setText("One-letter sequence:");
            this.panelName.setVisible(true);
            this.inputAminoAcidName.setVisible(true);

            this.labelTerminus.setVisible(true);
            this.labelTerminus.setText("Terminus:");
            this.panelTerminus.setVisible(true);
            this.fieldAminoAcidTerminus.setVisible(true);

            //this.labelCount.setVisible(false);
            //this.fieldCount.setVisible(false);
            this.panelDirectionSelectorCircle.setVisible(true);

            this.button.setText("Add");
            this.button.setVisible(true);

        } else if (state instanceof CATANA.ProteinMutateAminoAcidState) {
            this.labelName.setVisible(true);
            this.labelName.setText("Mutate to:");
            this.panelName.setVisible(true);
            this.selectAminoAcidName.setVisible(true);
        } else if (state instanceof CATANA.CgNucleicAcidExtendState) {
            // TODO This part is intentionally commented out now
            //      as it was difficult to clearly communicate 
            //      the behavior of this tool to the user and
            //      the default "dragging" behavior of the 
            //      extend action itself is sufficient.
            /*this.labelName.setVisible(true);
            this.labelName.setText("Extend with:");
            this.panelName.setVisible(true);
            this.fieldNucleotideName.setVisible(true);

            this.labelTerminus.setVisible(true);
            this.labelTerminus.setText("End:");
            this.panelTerminus.setVisible(true);
            this.fieldNucleotideDirectionality.setVisible(true);

            this.labelCount.setVisible(true);
            this.fieldCount.setVisible(true);
            this.panelDirectionSelectorCircle.setVisible(true);

            this.button.setText("Extend");
            this.button.setVisible(true);*/

            this.labelExtendDoubleStrand.setVisible(true);
            this.extendDoubleStrand.setVisible(true);
        } else if (state instanceof CATANA.CgNucleicAcidChangeTypeState) {
            this.labelName.setVisible(true);
            this.labelName.setText("Change to:");
            this.panelName.setVisible(true);
            this.fieldNucleotideName.setVisible(true);
            this.labelChangeComplement.setVisible(true);
            this.changeComplementCheckbox.setVisible(true);
        } else if (state instanceof CATANA.CgRemoveState) {
            this.labelTerminus.setVisible(true);
            this.labelTerminus.setText("Type of removal:");
            this.panelTerminus.setVisible(true);

            this.cgRemovalType.setVisible(true);
        } else if (state instanceof CATANA.ProteinRemoveState) {
            this.labelTerminus.setVisible(true);
            this.labelTerminus.setText("Type of removal:");
            this.panelTerminus.setVisible(true);

            this.aaRemovalType.setVisible(true);
        }
        else {
            this.setVisible(false);
        }
    }
}

export class DirectionSelectorCirclePanel extends Panel {

    private readonly circle: DirectionSelectorCircle;

    private readonly sliderAngle: Slider;
    private readonly sliderAnglePanel: Panel;
    private readonly sliderRadius: Slider;
    private readonly sliderRadiusPanel: Panel;

    public constructor(directionSelectorCircle: DirectionSelectorCircle) {
        super();
        const scope = this;

        this.circle = directionSelectorCircle;
        this.addClass("DirectionSelectorCirclePanel");

        this.sliderAngle = new Slider();
        this.sliderAngle.addCallback(CallbackType.INPUT, () => {
            const angleRad = this.sliderAngle.getValueNormalized() * 2 * Math.PI;
            directionSelectorCircle.setAngleRad(angleRad);
        });
        this.sliderAnglePanel = new Panel().add(this.sliderAngle);
        this.sliderAnglePanel.addClass("DirectionSelectorSliderContainer");

        this.sliderRadius = new Slider();
        const updateAngleSliderStateFun = function () {
            scope.sliderAngle.setEnabled(scope.sliderRadius.getValueNormalized() !== 0);
        }
        this.sliderRadius.addCallback(CallbackType.INPUT, () => {
            let radiusNormalized = scope.sliderRadius.getValueNormalized();
            directionSelectorCircle.setRadius(radiusNormalized, true);
            updateAngleSliderStateFun();
        });
        this.sliderRadiusPanel = new Panel().add(this.sliderRadius);
        this.sliderRadiusPanel.addClass("DirectionSelectorSliderContainer");

        const panelSliderAngle = new Panel();
        panelSliderAngle.setTitle("Angle");
        panelSliderAngle.addClass("DirectionSelectorSliderPanel");
        panelSliderAngle.add(new IconText(IconType.ANGLE));
        panelSliderAngle.add(this.sliderAnglePanel);

        const panelSliderRadius = new Panel();
        panelSliderRadius.setTitle("Radius");
        panelSliderRadius.addClass("DirectionSelectorSliderPanel");
        panelSliderRadius.add(new IconText(IconType.RADIUS));
        panelSliderRadius.add(this.sliderRadiusPanel);

        const panelCircleContainer = new Panel();
        panelCircleContainer.addClass("DirectionSelectorCircleContainer");
        panelCircleContainer.add(new Element<any>(directionSelectorCircle.domElement));

        this.add(panelSliderAngle);
        this.add(panelSliderRadius);
        this.add(panelCircleContainer);

        const updateCircleFun = function () {
            const radius = directionSelectorCircle.radiusNormalized;
            scope.sliderRadius.setValueNormalized(radius);

            let angle = directionSelectorCircle.angleRad;
            // The function 'angleRad' gives us values in the range [-pi, pi]
            // Dividing by 2*pi, we get values in the range [-0.5, 0.5]
            // By adding 1 to negatives values, we arrive in the range [0, 1] (which our sliders use)
            angle = (angle / (2 * Math.PI)) + (angle < 0 ? 1 : 0);
            scope.sliderAngle.setValueNormalized(angle);

            updateAngleSliderStateFun();
        }

        directionSelectorCircle.signals.directionChanged.add(updateCircleFun);

        updateCircleFun();
        updateAngleSliderStateFun();
        window.addEventListener("resize", () => scope.updateSlidersSize);
    }

    private updateSlidersSize() {
        const angleHeight = this.sliderAnglePanel.dom.clientHeight;
        const radiusHeight = this.sliderRadiusPanel.dom.clientHeight;
        this.sliderAngle.dom.setAttribute("style", "width:" + angleHeight + "px");
        this.sliderRadius.dom.setAttribute("style", "width:" + radiusHeight + "px");
    }

    public setVisible(visible: boolean) {
        super.setVisible(visible);
        this.circle.update();
        this.updateSlidersSize();
        return this;
    }

    public update() {
        this.circle.update();
    }
}

export default ModellingOptionsPanel;