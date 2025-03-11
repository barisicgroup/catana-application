import Element, { CallbackType } from "../element";
import TextElement from "../text-element";
import Button from "../button";
import Panel, { PanelOrientation } from "../panel";
import { IconButton, IconText, IconType } from "../icon";

/**
 * Modal box layer determines in which layer given modal box lies,
 * whereas only one modal box per layer can be opened at the same time.
 */
export enum ModalBoxLayer {
    DEFAULT,
    OVERLAY
}

class ModalBox extends Element<HTMLDivElement> {

    private static activeModalBoxes: Map<ModalBoxLayer, null | ModalBox> = new Map();

    private _layer: ModalBoxLayer = ModalBoxLayer.DEFAULT;

    protected readonly title: TextElement;
    protected readonly closeButton: Button;
    protected readonly header: Element<HTMLSpanElement>;
    protected readonly content: Panel;

    // Callbacks
    protected readonly showCallbacks: (() => void)[];
    protected readonly closeCallbacks: (() => void)[];

    public constructor(title: string, showOnStart: boolean = false, icon?: IconType) {
        super(document.createElement("div"));
        this.addClass("ModalBox");

        this.title = icon ? new IconText(icon, title) : new TextElement(title);
        const scope = this;

        this.showCallbacks = [];
        this.closeCallbacks = [];

        this.closeButton = new IconButton(IconType.CLOSE)
            .addClass("CloseButton")
            .addCallback(CallbackType.CLICK, () => {
                for (const c of scope.closeCallbacks) c();
                scope.hide();
            });

        this.header = new Panel(PanelOrientation.HORIZONTAL).addClass("Header");
        this.header.dom.appendChild(this.title.dom);
        this.header.dom.appendChild(this.closeButton.dom);

        this.content = new Panel(PanelOrientation.VERTICAL).addClass("Content");

        this.dom.appendChild(this.header.dom);
        this.dom.appendChild(this.content.dom);

        if (showOnStart) this.show();
        else this.hide();

        this.lockPositionToCenter();

        document.body.appendChild(this.dom);

        return this;
    }

    public get layer(): ModalBoxLayer {
        return this._layer;
    }

    public set layer(l: ModalBoxLayer) {
        if (this.isVisible()) {
            this.hide();
        }
        this._layer = l;
    }

    public add(...elements: Element<HTMLElement>[]) {
        for (const e of elements) {
            this.content.dom.appendChild(e.dom);
        }
        return this;
    }

    public clear() {
        this.content.clear();
        return this;
    }

    public show() {
        ModalBox.activeModalBoxes.get(this.layer)?.hide();
        ModalBox.activeModalBoxes.set(this.layer, this);
        this.setVisible(true);
        for (let c of this.showCallbacks) c();

        return this;
    }

    public hide() {
        if (ModalBox.activeModalBoxes.get(this.layer) === this) {
            ModalBox.activeModalBoxes.set(this.layer, null);
        }
        this.setVisible(false);

        return this;
    }

    public addOnShowCallback(callback: () => void) {
        this.showCallbacks.push(callback);
        return this;
    }

    public addOnCloseCallback(callback: () => void) {
        this.closeCallbacks.push(callback);
        return this;
    }

    public setPosition(x: number | string, y: number | string) {
        if (typeof x === "number") x = Math.floor(x).toString();
        if (typeof y === "number") y = Math.floor(y).toString();
        this.dom.style.left = x;
        this.dom.style.top = y;
        this.dom.style.transform = "";
    }

    public lockPositionToCenter() {
        this.dom.style.left = "50%";
        this.dom.style.top = "50%";
        this.dom.style.transform = "translate(-50%, -50%)";
    }
}

export default ModalBox;