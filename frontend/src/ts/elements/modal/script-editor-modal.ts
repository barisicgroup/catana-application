import { CodeJar, Position } from "codejar";
import Globals from "../../globals";
import { highlightCode } from "../../util";
import Button from "../button";
import RadioGroupPanel from "../complex/radio-group.panel";
import Table from "../complex/table";
import { CallbackType } from "../element";
import { IconType } from "../icon";
import TextElement from "../text-element";
import MovableModalBox from "./movable-modal-box";
import Element from "../element";
import { Log } from "catana-backend";
import TextArea from "../text-area";
import CATANA from "../../catana-instance";

class ScriptEditorModal extends MovableModalBox {
    private _codeType: "jspy" | "js" = "jspy";
    private _namingCounter: number = 0;

    public constructor(icon?: IconType) {
        super("Script Editor", false, icon);

        const languageSelectionPanel = new RadioGroupPanel(["JSPython", "JavaScript"]);
        // Creating "div" element instead of Panel is intentional since Panel has some bad side-effects
        // due to its classes and their styling.
        const editorPanel = new Element(document.createElement("div")).setId("scriptEditor");
        const codeEditor = CodeJar(editorPanel.dom, this.getHighlighter.bind(this));
        const outputLog = new TextArea("", false);
        outputLog.addClass("output-log");
        const runButton = new Button("Run script");
        const addToLoadedButton = new Button("Add to loaded scripts");
        const downloadButton = new Button("Download script file");

        languageSelectionPanel.addCallback(CallbackType.CHANGE, () => {
            this._codeType = languageSelectionPanel.getValue() === "JSPython" ? "jspy" : "js";
        });

        CATANA.Log.eventListeners.push((type, ...argArray) => {
            outputLog.addRow(argArray.join());
            outputLog.dom.scrollTop = outputLog.dom.scrollHeight;
        });

        runButton.addCallback(CallbackType.CLICK, () => {
            outputLog.setText("");
            const script = Globals.stage.pluginManager.getScriptInstance(codeEditor.toString(), this._codeType);
            script.run(Globals.stage).catch(reason => {
                Log.error("Script execution failed: ", reason);
            });
        });

        addToLoadedButton.addCallback(CallbackType.CLICK, () => {
            const pm = Globals.stage.pluginManager;
            const script = pm.getScriptInstance(codeEditor.toString(), this._codeType);
            pm.addScript(script, "editor_script_" + (++this._namingCounter) + "." + this._codeType);
            Log.info("Script loaded.");
        });

        downloadButton.addCallback(CallbackType.CLICK, () => {
            CATANA.download(new Blob([codeEditor.toString()], {
                type: "text/plain"
            }), "catana_script." + this._codeType);
        });

        this.addOnShowCallback(() => {
            outputLog.setText("");
        })

        this.content.add(
            new Table(2).addRow([
                new TextElement("Scripting language:"),
                languageSelectionPanel
            ]),
            editorPanel,
            new TextElement("Output:"),
            outputLog,
            runButton,
            addToLoadedButton,
            downloadButton);
    }

    private getHighlighter(editor: HTMLElement, pos?: Position | undefined): void {
        editor.innerHTML = highlightCode(editor.textContent ?? "", this._codeType);
    }
}

export default ScriptEditorModal;