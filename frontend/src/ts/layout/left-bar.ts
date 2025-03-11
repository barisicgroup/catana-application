import Element, { CallbackType } from "../elements/element";
import Icon, { IconButton, IconType } from "../elements/icon";
import {ButtonType} from "../elements/button";
import TextArea from "../elements/text-area";
import MainPanel from "./main-panel";
import Globals from "../globals";
import { PanelOrientation } from "../elements/panel";

class LeftBar extends MainPanel {

    private readonly _cgElements: Element[] = [];
    private readonly _aaElements: Element[] = [];
    private readonly _commonElements: Element[] = [];

    public constructor() {
        super(PanelOrientation.VERTICAL);

        const stage = Globals.stage!;

        this._aaElements.push(
            new Icon(IconType.STRUCTURE),
            ...Globals.actionsManager.allAtom.map(v => {
                return v(ButtonType.NORMAL)
            }));

        this._cgElements.push(
            new Icon(IconType.CG_STRUCTURE),
            ...Globals.actionsManager.coarseGrained.map(v => {
                return v(ButtonType.NORMAL)
            }));

        // TODO
        //regBut(IconType.TRANSFORM_TRANSLATE, "Move", this._commonElements, () => new CATANA.MoveState("translate"));
        //regBut(IconType.TRANSFORM_ROTATE, "Rotate", this._commonElements, () => new CATANA.MoveState("rotate"));

        {
            const buttonUndo = new IconButton(IconType.UNDO, "Undo");
            const textHistoryList = new TextArea("");
            textHistoryList.setEditable(false);
            { // Functions
                const updateHistoryListFun = () => {
                    let str = "";
                    let i = 1;
                    stage.catanaHistory.forEachCommand((command) => {
                        str += "(" + i + ") " + command.name + "\n";
                        ++i;
                    });
                    textHistoryList.setValue(str.substring(0, str.length - 1));
                };
                buttonUndo.addCallback(CallbackType.CLICK, () => {
                    stage.catanaHistory.undo();
                    updateHistoryListFun();
                });
                stage.catanaHistory.signals.commandDone.add((command) => {
                    updateHistoryListFun();
                });
            } // Functions
        }

        for (const list of [this.cgElements, this.aaElements, this.commonElements]) {
            for (const element of list) {
                this.start.add(element);
            }
        }

        this.end.setVisible(false);
    }

    public get cgElements(): Element[] {
        return this._cgElements;
    }

    public get aaElements(): Element[] {
        return this._aaElements;
    }

    public get commonElements(): Element[] {
        return this._commonElements;
    }

    public static getWidth(): number {
        return MainPanel.WIDE;
    }

    public setDimensionsRem(dim: { width: number, top: number, bottom: number }) {
        this.getStyle().width = dim.width + "rem";
        this.getStyle().top = dim.top + "rem";
        this.getStyle().bottom = dim.bottom + "rem";
        this.setVisible(!!dim.width);
    }
}

export default LeftBar;