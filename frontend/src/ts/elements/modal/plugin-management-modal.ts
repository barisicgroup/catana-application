import { flatten, Log, PluginManager, ScriptExtensions, PluginExtension, ScriptingApi } from "catana-backend";
import Globals from "../../globals";
import { getLastSessionPlugins } from "../../util";
import Button from "../button";
import { SimpleFormTable } from "../complex/table";
import TabsMenu from "../complex/tabs-menu";
import TitledPanel from "../complex/titled-panel";
import { CallbackType } from "../element";
import FileDropArea from "../file-drop-area";
import { IconButton, IconType } from "../icon";
import Input from "../input";
import Panel, { PanelOrientation } from "../panel";
import Select, { Options } from "../select";
import TextArea from "../text-area";
import TextElement from "../text-element";
import Toggle, { ToggleState } from "../toggle";
import MovableModalBox from "./movable-modal-box";

const AVAILABLE_EXTENSIONS = flatten([
    ScriptExtensions,
    PluginExtension
], []);

class PluginManagementModal extends MovableModalBox {
    private readonly _enabledVarInputTypes = ["string", "number", "boolean"];
    private readonly _globalPlugScope = "(global scope)";

    public constructor(icon?: IconType) {
        super("Plugin Management", false, icon);

        const loadAndRunPanel = new Panel(PanelOrientation.VERTICAL);
        const variablesPanel = new Panel(PanelOrientation.VERTICAL);
        const lastSessionPanel = new Panel(PanelOrientation.VERTICAL);
        const pluginManager = Globals.stage.pluginManager;

        // Load & Run tab
        const loadPluginLabel = new TitledPanel("Load plugin or script(s)");
        const pluginDropArea = this.createDropArea();
        const pluginSelectLabel = new TitledPanel("Loaded plugins");
        const scriptSelectLabel = new TitledPanel("Scripts from this plugin (scope)");
        const loadedPluginsSelect = new Select(this.getPluginSelectOptions(), false);
        const loadedScriptsSelect = new Select(this.getScriptSelectOptions(loadedPluginsSelect), false);
        const outputLog = new TextArea("", false);
        outputLog.addClass("output-log");
        const runSelectedScript = new Button("Run script");
        const attachScriptToUpdate = new Toggle(ToggleState.ON,
            "Attach script to the update call", "Detach script from the update call");

        const scriptSelUpdate = () => {
            loadedScriptsSelect.updateOptions(this.getScriptSelectOptions(loadedPluginsSelect));
            attachScriptToUpdate.setState(ToggleState.ON);
        }

        const plugSelUpdate = () => {
            loadedPluginsSelect.updateOptions(this.getPluginSelectOptions());
            scriptSelUpdate();
        }

        pluginManager.signals.scriptAdded.add(scriptSelUpdate);
        pluginManager.signals.scriptRemoved.add(scriptSelUpdate);

        pluginManager.signals.pluginAdded.add(plugSelUpdate);
        pluginManager.signals.pluginRemoved.add(plugSelUpdate);

        pluginManager.signals.updateAttachChanged.add((s) => {
            const selIdx = loadedScriptsSelect.getSelectedIndex();
            loadedScriptsSelect.updateOptions(this.getScriptSelectOptions(loadedPluginsSelect));
            loadedScriptsSelect.setSelectedIndex(selIdx);

            if (loadedScriptsSelect.getSelectedOptions()[0].value === s.uuid) {
                attachScriptToUpdate.setState(s.attachedToUpdate ? ToggleState.OFF : ToggleState.ON);
            }
        });

        loadedPluginsSelect.addCallback(CallbackType.CHANGE, scriptSelUpdate);

        loadedScriptsSelect.addCallback(CallbackType.CHANGE, () => {
            const selOptions = loadedScriptsSelect.getSelectedOptions();
            if (selOptions.length > 0) {
                const uuid = selOptions[0].value;
                const loadedScripts = pluginManager.loadedScripts;

                for (let script of loadedScripts) {
                    if (script.uuid === uuid) {
                        attachScriptToUpdate.setState(script.attachedToUpdate ? ToggleState.OFF : ToggleState.ON);
                        break;
                    }
                }
            }
        });

        Log.eventListeners.push((type, ...argArray) => {
            outputLog.addRow(argArray.join());
            outputLog.dom.scrollTop = outputLog.dom.scrollHeight;
        });

        runSelectedScript.addCallback(CallbackType.CLICK, () => {
            outputLog.setText("");
            const selOptions = loadedScriptsSelect.getSelectedOptions();
            if (selOptions.length > 0) {
                const uuid = selOptions[0].value;
                const script = pluginManager.getScript(uuid);
                if (script) {
                    script.run(Globals.stage).catch(reason => {
                        Log.error("Script execution failed: ", reason);
                    });
                }
            }
        });

        attachScriptToUpdate.addCallback(CallbackType.CLICK, () => {
            const selOptions = loadedScriptsSelect.getSelectedOptions();
            if (selOptions.length > 0) {
                const uuid = selOptions[0].value;
                if (!attachScriptToUpdate.isOn()) {
                    pluginManager.attachToUpdate(uuid);
                    outputLog.setText("");
                } else {
                    pluginManager.detachFromUpdate(uuid);
                }
            }
        });

        loadAndRunPanel.add(
            loadPluginLabel,
            pluginDropArea,
            pluginSelectLabel,
            loadedPluginsSelect,
            scriptSelectLabel,
            loadedScriptsSelect,
            runSelectedScript,
            attachScriptToUpdate,
            outputLog
        );

        // Variables tab
        const existingVariablesLabel = new TitledPanel("Existing shared variables");
        const existingVariablesTable = new SimpleFormTable();
        const reloadVariablesButton = new Button("Refresh variables' values");
        const newVariableTable = new SimpleFormTable();
        const addVariableButton = new Button("Add new variable");
        const addNewVariableLabel = new TitledPanel("Add shared variable");

        const updateVarsTable = () => {
            existingVariablesTable.clear();
            const vars = pluginManager.sharedVariables;

            for (let variable of vars) {
                const varName = variable[0];
                const valInput = new Input(variable[1]);
                const type = typeof variable[1];

                if (this._enabledVarInputTypes.includes(type)) {
                    valInput.addCallback(CallbackType.CHANGE, () => {
                        this.setSharedVariableValue(
                            pluginManager,
                            varName,
                            valInput.getValue(),
                            type
                        );
                    });
                } else {
                    valInput.setEnabled(false);
                }

                existingVariablesTable.addRow(
                    [new TextElement(varName), valInput]
                );
            }
        };
        updateVarsTable();

        reloadVariablesButton.addCallback(CallbackType.CLICK, updateVarsTable);

        const varNameInput = new Input("");
        const varNameValue = new Input("");

        newVariableTable.addRow(
            [new TextElement("Name: "), varNameInput]
        );

        newVariableTable.addRow(
            [new TextElement("Value: "), varNameValue]
        );

        addVariableButton.addCallback(CallbackType.CLICK, () => {
            this.setSharedVariableValue(
                pluginManager,
                varNameInput.getValue(),
                varNameValue.getValue()
            );
            varNameInput.setValue("");
            varNameValue.setValue("");
            updateVarsTable();
        });

        variablesPanel.add(
            existingVariablesLabel,
            existingVariablesTable,
            reloadVariablesButton,
            addNewVariableLabel,
            newVariableTable,
            addVariableButton
        );

        // Last session tab
        const lastSessionPlugLabel = new TitledPanel("Plugins loaded during the last session");
        const infoText = new TextElement("Installation will work only for plugins from the official repository.");
        const lastSessionPluginsTable = new SimpleFormTable();

        const updateLastSessPlugTable = () => {
            lastSessionPluginsTable.clear();
            const plugNames = getLastSessionPlugins();
            for (let pn of plugNames) {
                const name = pn;
                const loadBtn = new IconButton(IconType.SAVE, "Try to install plugin");
                loadBtn.addCallback(CallbackType.CLICK, () => {
                    ScriptingApi.installPlugin(name);
                });
                lastSessionPluginsTable.addRow([
                    new TextElement(name),
                    loadBtn
                ]);
            }
        };
        updateLastSessPlugTable();

        lastSessionPanel.add(
            lastSessionPlugLabel,
            infoText,
            lastSessionPluginsTable
        );

        this.add(new TabsMenu()
            .addTab("Load & Run", loadAndRunPanel)
            .addTab("Shared Variables", variablesPanel)
            .addTab("Last Session", lastSessionPanel)
        );

        this.addOnShowCallback(() => {
            outputLog.setText("");
        });
    }

    private setSharedVariableValue(pm: PluginManager, varName: string, varVal: any, varType?: string) {
        const varValLwr = varVal.toLowerCase();
        const autoIdentifType =
            !Number.isNaN(Number(varVal)) ? "number" :
                ((varValLwr === "true" || varValLwr === "false") ?
                    "boolean" : "string");
        const finType = varType ?? autoIdentifType;

        pm.setSharedVariable(varName,
            finType === "number" ? Number(varVal) :
                (finType === "boolean" ? (varVal === "true") :
                    varVal)
        );
    }

    private createDropArea(): FileDropArea {
        const fda = new FileDropArea("Choose files or drag them here", AVAILABLE_EXTENSIONS)
            .addCallback(CallbackType.CHANGE, () => {
                const files = fda.getFiles();
                if (files) {
                    Globals.stage.pluginManager.addFromLoadedFiles(files);
                }
            });
        return fda;
    }

    private getScriptSelectOptions(pluginSelect: Select): Options {
        let opt: any = {};
        const loadedScripts = Globals.stage.pluginManager.loadedScripts;
        const selPlug = pluginSelect.getSelectedOptions();
        let scope = "";
        let cnt = 0;

        if (selPlug.length > 0) {
            scope = selPlug[0].value;
        }

        for (let script of loadedScripts) {
            if (script.scope === scope) {
                opt[script.uuid] = (script.attachedToUpdate ? "(attached) " : "") + script.name;
                ++cnt;
            }
        }

        if (cnt === 0) {
            opt["default"] = "No scripts loaded";
        }

        return opt;
    }

    private getPluginSelectOptions(): Options {
        let opt: any = {};
        const loadedPlugins = Globals.stage.pluginManager.loadedPlugins;

        opt[""] = this._globalPlugScope;

        for (let plugin of loadedPlugins) {
            opt[plugin.name] = plugin.name;
        }

        return opt;
    }
}

export default PluginManagementModal;