import { Component, Log, PluginUIElemTypeRecord, PluginUIModal, ScriptingApi } from "catana-backend";
import Globals from "../../globals";
import Button from "../button";
import ColorPicker from "../color-picker";
import { CallbackType } from "../element";
import { IconType } from "../icon";
import Input from "../input";
import Select from "../select";
import { ComponentsSelect } from "../specialized/component/component";
import TextElement from "../text-element";
import MovableModalBox from "./movable-modal-box";

/**
 * Since different UI elements may have a different way/func. call to retrieve their value,
 * this interface serves for unifying the way this value is accessed.
 */
interface ValueItem {
    name: string;
    value: any;
}

/**
 * Simplifies creation of {@link ValueItem} objects.
 * The value is intentionally provided as callback to make sure that up-to-date
 * value is always retrieved.
*/
function createValueItem(name: string, vallCallback: () => any): ValueItem {
    return {
        get name() {
            return name;
        },
        get value() {
            return vallCallback();
        }
    }
}

/**
 * Class representing modal boxes that have their layout defined by the plugins/scripts.
 */
class ScriptCreatedModal extends MovableModalBox {
    private _valueItems: ValueItem[] = [];

    public constructor(modalData: PluginUIModal) {
        super(modalData.title, false, IconType.PLUGIN_EXTENSION);

        for (let i = 0; i < modalData.elements.length; ++i) {
            this.processElement(modalData.elements[i]);
        }
    }

    private processElement(elem: PluginUIElemTypeRecord) {
        switch (elem.type) {
            case "text":
                this.processElemText(elem);
                break;
            case "input-text":
                this.processElemInput(elem, "text");
                break;
            case "input-number":
                this.processElemInput(elem, "number");
                break;
            case "select":
                this.processElemSelect(elem);
                break;
            case "component-select":
                this.processElemCompSelect(elem);
                break;
            case "color":
                this.processElemColor(elem);
                break;
            case "button":
                this.processElemButton(elem);
                break;
            default:
                Log.error("Unknown UI element type: " + elem.type);
                break;
        }
    }

    private processElemText(elem: PluginUIElemTypeRecord): void {
        this.add(new TextElement((elem as any).content));
    }

    private processElemInput(elem: PluginUIElemTypeRecord, type: "text" | "number"): void {
        const input = new Input(undefined, type);

        this.add(input);
        this._valueItems.push(
            createValueItem(
                elem.name,
                () => type === "text" ? input.getValue() : Number.parseFloat(input.getValue())
            )
        );
    }

    private processElemSelect(elem: PluginUIElemTypeRecord): void {
        const select = new Select((elem as any).options, (elem as any).allowMultiple);

        this.add(select);
        this._valueItems.push(
            createValueItem(
                elem.name,
                () => {
                    let options = select.getSelectedOptions();
                    let optionsArr: string[] = [];
                    for (let i = 0; i < options.length; ++i) {
                        optionsArr.push(options[i].value);
                    }
                    return optionsArr;
                }
            )
        );
    }

    private processElemCompSelect(elem: PluginUIElemTypeRecord): void {
        const select = new ComponentsSelect(["structure", "cg-structure"], undefined, (elem as any).allowMultiple);

        this.add(select);
        this._valueItems.push(
            createValueItem(
                elem.name,
                () => {
                    let options = select.getSelectedOptions();
                    let comps: Component[] = [];

                    for (let i = 0; i < options.length; ++i) {
                        const c = Globals.stage.compList.find(x => x.uuid === options[i].value);
                        if (c) {
                            comps.push(c);
                        }
                    }

                    return comps;
                }
            )
        );
    }

    private processElemColor(elem: PluginUIElemTypeRecord): void {
        const colorPicker = new ColorPicker();

        this.add(colorPicker);
        this._valueItems.push(
            createValueItem(
                elem.name,
                () => colorPicker.getValue()
            )
        );
    }

    private processElemButton(elem: PluginUIElemTypeRecord): void {
        const button = new Button((elem as any).content);

        button.addCallback(CallbackType.CLICK, () => {
            const scriptName = (elem as any).callback;
            const valMap = this.getValuesMap();
            ScriptingApi.runScript(scriptName, valMap);
        });

        this.add(button);
    }

    private getValuesMap(): { [key: string]: any } {
        const map = {}

        this._valueItems.forEach(x => {
            map[x.name] = x.value;
        });

        return map;
    }
}

export default ScriptCreatedModal;