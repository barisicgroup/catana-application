import Button, { ButtonType } from "./elements/button";
import { IconButton, IconType } from "./elements/icon";
import { CallbackType } from "./elements/element";
import MovableModalBox from "./elements/modal/movable-modal-box";
import Globals from "./globals";
import ModellingOptionsPanel from "./elements/specialized/modelling-options-panel";
import {
    CatanaState,
    CatanaStateData, CenterState,
    CgNucleicAcidChangeTypeState,
    CgNucleicAcidConnectState,
    CgNucleicAcidCreateState,
    CgNucleicAcidCreateComplementaryState,
    CgNucleicAcidExtendState,
    CgRemoveState, CreateLatticeState, MoveState,
    ProteinAddAminoAcidsState,
    ProteinMutateAminoAcidState,
    ProteinRemoveState
} from "catana-backend";

const CG_ACTIONS = [
    "CG_CREATE_SS",
    "CG_CREATE_DS",
    "CG_CREATE_COMPLEMENT",
    "CG_EXTEND",
    "CG_CONNECT_NT",
    "CG_CHANGE_NUCLEOBASE_TYPE",
    "CG_REMOVE",
    "CG_CREATE_SQ_LATTICE",
    "CG_CREATE_HC_LATTICE"
] as const;

const AA_ACTIONS = [
    "AA_ADD_AMINO_ACID",
    "AA_MUTATE_AMINO_ACID",
    "AA_REMOVE"
] as const;

const OTHER_ACTIONS = [
    "OTHER_CENTER",
    "OTHER_TRANSLATE",
    "OTHER_ROTATE",
] as const;

type AnyAction = typeof CG_ACTIONS[number] | typeof AA_ACTIONS[number] | typeof OTHER_ACTIONS[number];

const NAME_TO_STATE_CONSTR: { [type in AnyAction]: StateConstr } = {
    // Coarse-grained actions
    "CG_CREATE_SS": CgNucleicAcidCreateState,
    "CG_CREATE_DS": CgNucleicAcidCreateState,
    "CG_CREATE_COMPLEMENT": CgNucleicAcidCreateComplementaryState,
    "CG_EXTEND": CgNucleicAcidExtendState,
    "CG_CONNECT_NT": CgNucleicAcidConnectState,
    "CG_CHANGE_NUCLEOBASE_TYPE": CgNucleicAcidChangeTypeState,
    "CG_REMOVE": CgRemoveState,
    "CG_CREATE_SQ_LATTICE": CreateLatticeState,
    "CG_CREATE_HC_LATTICE": CreateLatticeState,

    // All-atom actions
    "AA_ADD_AMINO_ACID": ProteinAddAminoAcidsState,
    "AA_MUTATE_AMINO_ACID": ProteinMutateAminoAcidState,
    "AA_REMOVE": ProteinRemoveState,

    // Other actions
    "OTHER_CENTER": CenterState,
    "OTHER_TRANSLATE": MoveState,
    "OTHER_ROTATE": MoveState,
};

type StateConstr = new (...params: any[]) => CatanaState;
function state2name(state: CatanaState): null | AnyAction {
    if (!state) return null;
    const states = Object.values(NAME_TO_STATE_CONSTR);
    const index = states.indexOf(Object.getPrototypeOf(state).constructor);
    if (index === -1) return null;
    return Object.keys(NAME_TO_STATE_CONSTR) as unknown as AnyAction;
}

type Action = (type?: ButtonType) => Button;

class ActionsManager {
    private dialog: null | MovableModalBox = null;

    private readonly buttons: Map<AnyAction, Button[]> = new Map<AnyAction, Button[]>();
    public readonly catanaStateData = new CatanaStateData();

    private readonly modellingOptionsPanel: ModellingOptionsPanel;

    private readonly ACTIONS: { [type in AnyAction]: Action } = {
        // Coarse-grained actions
        "CG_CREATE_SS": (t) => this._createButton("CG_CREATE_SS", IconType.CREATE_DNA_SS, "Create single strand", t, () => new CgNucleicAcidCreateState(false)),
        "CG_CREATE_DS": (t) => this._createButton("CG_CREATE_DS", IconType.CREATE_DNA_DS, "Create double strand", t, () => new CgNucleicAcidCreateState(true)),
        "CG_CREATE_COMPLEMENT": (t) => this._createButton("CG_CREATE_COMPLEMENT", IconType.CREATE_COMPLEMENTARY_STRAND, "Create complementary strand", t, () => new CgNucleicAcidCreateComplementaryState()),
        "CG_EXTEND": (t) => this._createButton("CG_EXTEND", IconType.EXTEND_DNA, "Extend", t, () => new CgNucleicAcidExtendState(this.catanaStateData)),
        "CG_CONNECT_NT": (t) => this._createButton("CG_CONNECT_NT", IconType.CONNECT_NUCLEOTIDES, "Connect nucleotides", t, () => new CgNucleicAcidConnectState()),
        "CG_CHANGE_NUCLEOBASE_TYPE": (t) => this._createButton("CG_CHANGE_NUCLEOBASE_TYPE", IconType.MUTATE_NUCLEOTIDE, "Change nucleobase type", t, () => new CgNucleicAcidChangeTypeState(this.catanaStateData)),
        "CG_REMOVE": (t) => this._createButton("CG_REMOVE", IconType.REMOVE, "Remove", t, () => new CgRemoveState(this.modellingOptionsPanel.getSelectedCgRemovalType())),
        "CG_CREATE_SQ_LATTICE": (t) => this._createButton("CG_CREATE_SQ_LATTICE", IconType.SQUARE_LATTICE, "Create square lattice", t, () => new CreateLatticeState(false)),
        "CG_CREATE_HC_LATTICE": (t) => this._createButton("CG_CREATE_HC_LATTICE", IconType.HONEYCOMB_LATTICE, "Create honeycomb lattice", t, () => new CreateLatticeState(true)),

        // All-atom actions
        "AA_ADD_AMINO_ACID": (t) => this._createButton("AA_ADD_AMINO_ACID", IconType.ADD_AMINO_ACID, "Add amino acid", t, () => {
            this.catanaStateData.aaName = this.modellingOptionsPanel.getAminoAcidSequence("add")!;
            return new ProteinAddAminoAcidsState(this.catanaStateData);
        }),
        "AA_MUTATE_AMINO_ACID": (t) => this._createButton("AA_MUTATE_AMINO_ACID", IconType.MUTATE_AMINO_ACID, "Mutate amino acid", t, () => {
            this.catanaStateData.aaName = this.modellingOptionsPanel.getAminoAcidSequence("mutate")!;
            return new ProteinMutateAminoAcidState(this.catanaStateData);
        }),
        "AA_REMOVE": (t) => this._createButton("AA_REMOVE", IconType.REMOVE, "Remove", t, () => new ProteinRemoveState(this.modellingOptionsPanel.getSelectedAaRemovalType())),

        // Other actions
        "OTHER_CENTER": (t) => this._createButton("OTHER_CENTER", IconType.TARGET, "Center", t, () => new CenterState()),
        "OTHER_TRANSLATE": (t) => this._createButton("OTHER_TRANSLATE", IconType.TRANSFORM_TRANSLATE, "Move", t, () => new MoveState("translate", this.catanaStateData)),
        "OTHER_ROTATE": (t) => this._createButton("OTHER_ROTATE", IconType.TRANSFORM_ROTATE, "Rotate", t, () => new MoveState("rotate", this.catanaStateData)),
    };

    public constructor() {
        this.modellingOptionsPanel = new ModellingOptionsPanel(Globals.stage.catanaVisManager.dirSel.circle);

        this.catanaStateData.setPolymerParams(
            this.modellingOptionsPanel.getAminoAcidSequence()!,
            this.modellingOptionsPanel.getAminoAcidTerminus(),
            this.modellingOptionsPanel.getNucleotideName(),
            this.modellingOptionsPanel.getNucleotideDirectionality(),
            this.modellingOptionsPanel.getCount());
        this.modellingOptionsPanel.addAminoAcidNameCallback(() => this.catanaStateData.aaName = this.modellingOptionsPanel.getAminoAcidSequence()!);
        this.modellingOptionsPanel.addAminoAcidTerminusCallback(() => this.catanaStateData.chainEndToAppendAATo = this.modellingOptionsPanel.getAminoAcidTerminus());
        this.modellingOptionsPanel.addNucleotideNameCallback(() => this.catanaStateData.ntName = this.modellingOptionsPanel.getNucleotideName());
        this.modellingOptionsPanel.addNucleotideDirectionalityCallback(() => this.catanaStateData.strandEndToAppendNTTo = this.modellingOptionsPanel.getNucleotideDirectionality());
        this.modellingOptionsPanel.addCountCallback(() => this.catanaStateData.count = this.modellingOptionsPanel.getCount());
        this.modellingOptionsPanel.addComplBaseChangeCallback(() => this.catanaStateData.changeAlsoComplementary = this.modellingOptionsPanel.getChangeComplBaseState());
        this.modellingOptionsPanel.addExtendDoubleStrandCallback(() => this.catanaStateData.extendDoubleStrand = this.modellingOptionsPanel.getExtendDoubleStrandState());

        Globals.stage.catanaActions.signals.stateChanged.add(() => {
            this.dialog?.hide();
            const state = Globals.stage.catanaActions.getState();
            ActionsManager.updateDescription();
            if (state === null) {
                this.forEachButton((b) => b.setSelected(false));
                return;
            }
            const action: null | AnyAction = state2name(state);
            if (!action) {
                console.error("Unable to convert CatanaState to AnyAction. State: " + state);
                return;
            }
            for (const b of this.getButtons(action)) {
                b.setSelected(true);
            }
        });
    }

    public readonly coarseGrained: Action[] = CG_ACTIONS.map(key => this.ACTIONS[key]);
    public readonly allAtom: Action[] = AA_ACTIONS.map(key => this.ACTIONS[key]);
    public readonly other: Action[] = OTHER_ACTIONS.map(key => this.ACTIONS[key]);

    public get stateData(): CatanaStateData {
        return this.catanaStateData;
    }

    public createButton(action: AnyAction, type?: ButtonType): Button {
        return this.ACTIONS[action](type);
    }

    private getButtons(a: AnyAction): Button[] {
        let buttons = this.buttons.get(a);
        if (!buttons) {
            buttons = [];
            this.buttons.set(a, buttons);
        }
        return buttons;
    }

    private forEachButton(callback: (b: Button) => void) {
        for (const b of this.buttons.values()) b.forEach(v => callback(v));
    }

    private _createButton(action: AnyAction, icon: IconType, text: string, type: undefined | ButtonType, catanaStateCreationFun: () => CatanaState): Button {
        const button = new IconButton(icon, "", type).setTitle(text);
        this.getButtons(action).push(button);
        button.addCallback(CallbackType.CLICK, () => {
            this.buttonClickFun(action, button, catanaStateCreationFun)
        });
        // Button is automatically unselected when hidden, i.e., when changing the layout
        button.addCallback(CallbackType.VISIBILITYCHANGED, () => {
            if (!button.isVisible() && button.isSelected()) {
                button.dom.click();
            }
        });
        return button;
    }

    private static updateDescription() {
        const state = Globals.stage.catanaActions.getState();
        if (!state) Globals.layoutManager.bottomBar.clearDescriptionText();
        else Globals.layoutManager.bottomBar.setDescriptionText(state.description());
    }

    private buttonClickFun(action: AnyAction, button: Button, catanaStateCreationFun: () => CatanaState) {
        const select = !button.isSelected();
        this.forEachButton(b => b.setSelected(false));
        let state: null | CatanaState = null;
        if (select) {
            for (const b of this.getButtons(action)) b.setSelected(true);
            button.appendAfter(this.modellingOptionsPanel);
            state = catanaStateCreationFun();
        }
        Globals.stage.catanaActions.setState(state, true);
        ActionsManager.updateDescription();
        this.modellingOptionsPanel.setState(state);
        if (this.dialog) this.dialog.dispose();
        if (this.modellingOptionsPanel.isVisible()) {
            let text = button.getText();
            if (text === "") text = button.getTitle();
            this.dialog = new MovableModalBox(text, true)
                .add(this.modellingOptionsPanel)
                .addOnCloseCallback(() => {
                    this.dialog?.clear();
                    this.dialog?.dispose();
                    this.forEachButton(b => b.setSelected(false));
                    Globals.stage.catanaActions.setState(null, true);
                    this.modellingOptionsPanel.setState(null);
                    ActionsManager.updateDescription();
                    this.dialog = null;
                });
        }
    }
}

export default ActionsManager;