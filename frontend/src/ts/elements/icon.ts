import Element from "./element";
import TextElement, { TextType } from "./text-element";
import Button, { ButtonType } from "./button";
import Toggle, { ToggleState } from "./toggle";
import Dropdown, { DropdownType } from "./complex/dropdown";

export enum IconType {
    EXPAND = 1, COLLAPSE, CLOSE,
    REMOVE, CONNECT, PLUS, CHANGE,
    FILTER, MAGIC, PENCIL,
    UP, DOWN,
    REFRESH, DOWNLOAD,
    CLIPBOARD,
    QUESTION_MARK, DEBUG, TOUR,

    TRASH,
    EYE, EYE_SLASH,
    TARGET, INFO, MORE, COLORING,
    SUPERPOSE, DUPLICATE,

    DNA, STRUCTURE, CG_STRUCTURE,
    SQUARE_LATTICE, HONEYCOMB_LATTICE,
    ANGLE, RADIUS,
    TRANSFORM, TRANSFORM_TRANSLATE, TRANSFORM_ROTATE,
    GLOBAL, LOCAL, PRINCIPAL_COMPONENTS,
    CREATE,

    RIGIDBODY_DYNAMICS, RELAXATION, COLLISION,

    OPEN, SAVE,
    LIGHTING, CAMERA,
    QUESTION_CIRCLE, INFO_CIRCLE, MANUAL, BUG,
    UNDO, APP,
    SETTINGS,
    LAYOUT,
    SELECT_ARROW,
    GLOBE,
    SCENE_TO_FOCUS,
    GRID,
    ASTERISK,
    HIERARCHY,
    LOCK,
    UNLOCK,
    PLAY,
    STOP,
    PAUSE,
    EXPLODE,

    CREATE_DNA_SS, CREATE_DNA_DS,
    CREATE_COMPLEMENTARY_STRAND,
    SET_STRAND_SEQUENCE,
    MUTATE_NUCLEOTIDE,
    EXTEND_DNA,
    CONNECT_NUCLEOTIDES,
    MUTATE_AMINO_ACID,
    ADD_AMINO_ACID,
    DETECT_BASE_PAIRS,
    AXES,
    UNION,
    PLAY_CIRCLE,
    ARROW_LEFT,
    ARROW_RIGHT,
    SERVER,
    CHECK_MARK,
    X_MARK,
    CARET_DOWN,
    CARET_UP,
    CODE,
    PLUGIN_EXTENSION
}

// fa fa-* for Font Awesome
// bi-* for Bootstrap Icons
const icon2str: { [type in IconType]: string } = {
    [IconType.EXPAND]: "fa fa-chevron-right",
    [IconType.COLLAPSE]: "fa fa-chevron-down",
    [IconType.CLOSE]: "fa fa-times",
    [IconType.REMOVE]: "fa fa-times",
    [IconType.CONNECT]: "fa fa-link",
    [IconType.PLUS]: "fa fa-plus",
    [IconType.CHANGE]: "fa fa-exchange-alt",
    [IconType.FILTER]: "fa fa-filter",
    [IconType.MAGIC]: "fa fa-magic",
    [IconType.PENCIL]: "fa fa-pencil-alt",
    [IconType.UP]: "fa fa-chevron-up",
    [IconType.DOWN]: "fa fa-chevron-down",
    [IconType.REFRESH]: "fa fa-sync",
    [IconType.DOWNLOAD]: "fa fa-download",
    [IconType.CLIPBOARD]: "fa fa-clipboard",
    [IconType.QUESTION_MARK]: "fa fa-question",
    [IconType.DEBUG]: "fa fa-bug",
    [IconType.TOUR]: "fa fa-route",
    [IconType.TRASH]: "fa fa-trash-alt",
    [IconType.EYE]: "fa fa-eye",
    [IconType.EYE_SLASH]: "fa fa-eye-slash",
    [IconType.TARGET]: "fa fa-crosshairs",
    [IconType.INFO]: "fa fa-info",
    [IconType.MORE]: "fa fa-ellipsis-h",
    [IconType.COLORING]: "fa fa-paint-brush",
    [IconType.SUPERPOSE]: "fa fa-grip-lines-vertical",
    [IconType.DUPLICATE]: "fa fa-copy",
    [IconType.DNA]: "fa fa-dna",
    [IconType.STRUCTURE]: "catana-all-atom-structure",
    [IconType.CG_STRUCTURE]: "catana-coarse-grained-structure",
    [IconType.SQUARE_LATTICE]: "catana-square-lattice",
    [IconType.HONEYCOMB_LATTICE]: "catana-honeycomb-lattice",
    [IconType.ANGLE]: "fa fa-drafting-compass",
    [IconType.RADIUS]: "fa fa-slash",
    [IconType.TRANSFORM]: "fa fa-arrows-alt",
    [IconType.TRANSFORM_TRANSLATE]: "fa fa-arrows-alt",
    [IconType.TRANSFORM_ROTATE]: "fa fa-sync-alt",
    [IconType.GLOBAL]: "bi-globe",
    [IconType.LOCAL]: "bi-geo-alt-fill",
    [IconType.PRINCIPAL_COMPONENTS]: "bi-asterisk",
    [IconType.CREATE]: "fa fa-plus-circle",
    [IconType.RIGIDBODY_DYNAMICS]: "bi bi-bounding-box-circles",
    [IconType.RELAXATION]: "fa fa-umbrella-beach",
    [IconType.COLLISION]: "catana-collision",
    [IconType.OPEN]: "fa fa-folder-open",
    [IconType.SAVE]: "fa fa-save",
    [IconType.LIGHTING]: "fa fa-sun",
    [IconType.CAMERA]: "fa fa-camera",
    [IconType.QUESTION_CIRCLE]: "fa fa-question-circle",
    [IconType.INFO_CIRCLE]: "fa fa-info-circle",
    [IconType.MANUAL]: "fa fa-book-open",
    [IconType.BUG]: "fa fa-bug",
    [IconType.UNDO]: "fa fa-undo",
    [IconType.APP]: "bi-app",
    [IconType.SETTINGS]: "fa fa-wrench",
    [IconType.LAYOUT]: "bi-grid-1x2",
    [IconType.SELECT_ARROW]: "fa fa-chevron-down",
    [IconType.GLOBE]: "bi-globe",
    [IconType.HIERARCHY]: "bi bi-diagram-2",
    [IconType.SCENE_TO_FOCUS]: "bi bi-aspect-ratio",
    [IconType.GRID]: "bi bi-grid-3x3",
    [IconType.ASTERISK]: "bi bi-asterisk",
    [IconType.LOCK]: "bi bi-lock-fill",
    [IconType.UNLOCK]: "bi bi-unlock-fill",
    [IconType.PLAY]: "bi bi-play-fill",
    [IconType.STOP]: "bi bi-stop-fill",
    [IconType.PAUSE]: "bi bi-pause-fill",
    [IconType.EXPLODE]: "fa fa-bomb",
    [IconType.CREATE_DNA_SS]: "catana-create-dna-ss",
    [IconType.CREATE_DNA_DS]: "catana-create-dna-ds",
    [IconType.CREATE_COMPLEMENTARY_STRAND]: "catana-create-complement-strand",
    [IconType.EXTEND_DNA]: "catana-extend-dna",
    [IconType.SET_STRAND_SEQUENCE]: "catana-set-strand-sequence",
    [IconType.MUTATE_NUCLEOTIDE]: "catana-mutate-nucleotide",
    [IconType.CONNECT_NUCLEOTIDES]: "catana-connect-nucleotides",
    [IconType.MUTATE_AMINO_ACID]: "catana-mutate-amino-acid",
    [IconType.ADD_AMINO_ACID]: "catana-append-amino-acid",
    [IconType.DETECT_BASE_PAIRS]: "bi bi-arrow-left-right",
    [IconType.AXES]: "catana-axes",
    [IconType.UNION]: "bi bi-union",
    [IconType.PLAY_CIRCLE]: "bi bi-play-circle-fill",
    [IconType.ARROW_LEFT]: "bi bi-arrow-left",
    [IconType.ARROW_RIGHT]: "bi bi-arrow-right",
    [IconType.SERVER]: "bi bi-server",
    [IconType.CHECK_MARK]: "bi bi-check-lg",
    [IconType.X_MARK]: "bi bi-x-lg",
    [IconType.CARET_DOWN]: "bi bi-caret-down-square-fill",
    [IconType.CARET_UP]: "bi bi-caret-up-square-fill",
    [IconType.CODE]: "bi bi-braces",
    [IconType.PLUGIN_EXTENSION]: "fa fa-puzzle-piece"
};

class Icon extends Element {
    public constructor(type?: IconType) {
        super(document.createElement("i"));
        this.setIcon(type || null);
    }
    public setIcon(type: null | IconType) {
        if (!type) {
            this.dom.className = "Icon";
            this.setVisible(false);
        } else {
            this.dom.className = "Icon " + icon2str[type];
            this.setVisible(true);
        }
        return this;
    }
}

export class IconText extends TextElement {
    private _icon: Icon;
    private _text: TextElement;
    public constructor(icon?: IconType, text?: string, type: TextType = TextType.NORMAL) {
        super(undefined, type);
        this.addClass("IconElement");
        this._icon = new Icon(icon);
        this._text = new TextElement(text);
        //this.dom.appendChild(this._icon.dom);
        //this.dom.insertAdjacentElement("afterbegin", this._icon.dom);
        this.dom.appendChild(this._icon.dom);
        this.dom.appendChild(this._text.dom);
    }
    public setIcon(icon: null | IconType) {
        this._icon?.setIcon(icon);
        this.setVisible(this._text.isVisible() || this._icon.isVisible());
        return this;
    }
    public setText(text: string) {
        //super.setText(text);
        this._text.setText(text);
        //if (this._icon) this.dom.insertAdjacentElement("afterbegin", this._icon.dom);
        //this.setVisible(text !== "");
        this._text.setVisible(text !== "");
        this.setVisible(this._text.isVisible() || this._icon.isVisible());
        return this;
    }
}

export class IconButton extends Button {
    private _icon: Icon;
    private _text: TextElement;
    public constructor(icon?: IconType, text?: string, type: ButtonType = ButtonType.NORMAL) {
        super(text || "", type);
        this.addClass("IconElement");
        this._icon = new Icon(icon);
        this._text = new TextElement();
        this.dom.appendChild(this._icon.dom);
        this.dom.appendChild(this._text.dom);
        this.setText(text || "");
    }
    public setIcon(icon: null | IconType) {
        this._icon?.setIcon(icon);
        return this;
    }
    public setText(text: string): this {
        this._text?.setVisible(text !== "");
        this._text?.setText(text);
        return this;
    }
}

export class IconToggle extends Toggle {
    private readonly _icon: Icon;
    private readonly _text: TextElement;
    private iconOn: IconType;
    private iconOff: IconType;
    public constructor(state: ToggleState, iconOn: IconType, iconOff: IconType, textOn?: string, textOff?: string, type: ButtonType = ButtonType.NORMAL) {
        super(state, textOn || "", textOff || "", type);
        this.addClass("IconElement");
        this._icon = new Icon(this.isOn() ? iconOn : iconOff);
        this._text = new TextElement();
        this.iconOn = iconOn;
        this.iconOff = iconOff;
        this.dom.appendChild(this._icon.dom);
        this.dom.appendChild(this._text.dom);
        this.setText((this.isOn() ? textOn : textOff) || "");
    }
    public setIcon(iconOn: IconType, iconOff: IconType) {
        this.iconOn = iconOn;
        this.iconOff = iconOff;
        this.setState(this.state);
        return this;
    }
    public setState(state: ToggleState, silent: boolean = false): this {
        super.setState(state, silent);
        this._icon?.setIcon(this.isOn() ? this.iconOn : this.iconOff);
        return this;
    }
    public setText(text: string): this {
        this._text?.setVisible(text !== "");
        this._text?.setText(text);
        return this;
    }
}

export class IconDropdown extends Dropdown {
    private _iconButton: IconButton;
    public constructor(icon?: IconType, text?: string, type?: DropdownType, down: boolean = true) {
        super(text || "", type, down);
        this.addClass("IconElement");
        this.setIcon(icon || null);
    }
    public setIcon(icon: null | IconType) {
        this._iconButton.setIcon(icon);
        return this;
    }
    protected createButton(text: string, type?: ButtonType): IconButton {
        return this._iconButton = new IconButton(undefined, text, type);
    }
}

export default Icon;