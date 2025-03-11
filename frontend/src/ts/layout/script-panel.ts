import { CLICommandsParser, Stage } from "catana-backend";
import CATANA from "../catana-instance";
import { CallbackType } from "../elements/element";
import { IconToggle, IconType } from "../elements/icon";
import Input from "../elements/input";
import TextArea from "../elements/text-area";
import { ToggleState } from "../elements/toggle";
import MainPanel from "./main-panel";
import { PanelOrientation } from "../elements/panel";

class ScriptPanel extends MainPanel {
    private _currHeight: number = MainPanel.FULL;
    private _commandsHistory: string[] = [];
    private _commandsHistoryIdx: number = 0;

    public constructor(stage: Stage) {
        super(PanelOrientation.VERTICAL);

        const historyTextArea = new TextArea();
        historyTextArea.addClass("ScriptingText console");
        historyTextArea.setEditable(false);
        this.initTextArea(historyTextArea);

        CATANA.Log.eventListeners.push((type, ...argArray) => {
            historyTextArea.addRow("> LOG [" + type + "]: " + argArray.join());
            historyTextArea.dom.scrollTop = historyTextArea.dom.scrollHeight;
        });

        const commandInput = new Input("", "text", "CATANA> Insert command (for example, 'help' or 'fetch_rcsb(\"3ugm\")') and press 'Enter' to execute it");
        commandInput.addClass("ScriptingText console");

        const collapseToggle = new IconToggle(ToggleState.ON, IconType.CARET_DOWN,
            IconType.CARET_UP, "Collapse", "Expand");

        collapseToggle.addCallback(CallbackType.CHANGE, () => {
            if (collapseToggle.isOn()) {
                this._currHeight = MainPanel.FULL;
            } else {
                this._currHeight = MainPanel.WIDE * 2;
            }

            this.getStyle().height = this.getHeight() + "rem";
        });

        const scriptingParser = new CLICommandsParser(stage);

        // Few callbacks for more user-friendly controls
        commandInput.addCallback(CallbackType.KEYDOWN, (types, src, e: KeyboardEvent) => {
            if (e.code === "Escape") {
                commandInput.setValue("");
            } else if (e.code === "ArrowUp") {
                this._commandsHistoryIdx = Math.max(0, this._commandsHistoryIdx - 1);
                if (this._commandsHistory.length > this._commandsHistoryIdx) {
                    commandInput.setValue(this._commandsHistory[this._commandsHistoryIdx]);
                }
            } else if (e.code === "ArrowDown") {
                this._commandsHistoryIdx = Math.min(this._commandsHistory.length, this._commandsHistoryIdx + 1);
                if (this._commandsHistory.length > this._commandsHistoryIdx) {
                    commandInput.setValue(this._commandsHistory[this._commandsHistoryIdx]);
                }
            }
        });

        commandInput.addOnEnterDownCallback(() => {
            const commandVal = commandInput.getValue();
            const commandTrimmed = commandVal.trim();

            if (commandVal.length === 0) {
                return;
            }

            this._commandsHistory.push(commandVal);
            this._commandsHistoryIdx = this._commandsHistory.length;

            historyTextArea.addRow("CATANA> " + commandVal);
            historyTextArea.dom.scrollTop = historyTextArea.dom.scrollHeight;

            commandInput.setValue("");

            // Purely "front-end command" to clear the console
            if (commandTrimmed === "CLEAR") {
                this.initTextArea(historyTextArea);
                return;
            }

            commandInput.setEnabled(false);

            scriptingParser.executeCommand(commandVal)
                .then((msg) => {
                    historyTextArea.addRow("\n" + msg);
                }, (errMsg) => {
                    historyTextArea.addRow("\n [!] " + errMsg);
                }).finally(() => {
                    historyTextArea.dom.scrollTop = historyTextArea.dom.scrollHeight;
                    commandInput.setEnabled(true);
                });
        });

        this.addToRoot(collapseToggle, historyTextArea, commandInput);
    }

    public getHeight(): number {
        return this._currHeight;
    }

    public setDimensionsRem(dim: { right: number, bottom: number, left: number }) {
        this.getStyle().right = dim.right + "rem";
        this.getStyle().bottom = dim.bottom + "rem";
        this.getStyle().left = dim.left + "rem";
        this.getStyle().height = this.getHeight() + "rem";
    }

    private initTextArea(cmdTextArea: TextArea): void {
        cmdTextArea.setValue("");
        cmdTextArea.addRow("CATANA web application [version " + CATANA.Version + "]");
        cmdTextArea.addRow("Loaded: " + new Date().toLocaleString());
    }
}

export default ScriptPanel;