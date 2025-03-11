import { autoLoad, Component, getFileInfo, Log, PluginUIElemTypeRecord, PluginUIModal } from "../../catana";
import JSScript, { IScript } from "../../script";
import type Stage from "../../stage/stage";
import JSPyScript from "./jspyscript";
import ScriptingApi from "./scripting-api";
import { Signal } from "signals";
import { generateUUID } from "../../math/math-utils";
import IUpdateable from "../utils/iupdateable";
import { LoaderInput } from "../../loader/loader-utils";
import { isValidPluginUIElemTypeRecord } from "./plugin-ui";
import { IScriptRecord } from "./iscript-record";
import { IPluginRecord } from "./iplugin-record";
import { PluginExtension } from "../../globals";

/**
 * Signals emitted by the plugin manager
 */
export interface PluginManagerSignals {
    /**
     * Invoked when a new plugin is loaded.
     */
    pluginAdded: Signal;
    /**
     * Invoked when a plugin is removed
     */
    pluginRemoved: Signal;
    /**
     * Invoked when a new script is loaded
     */
    scriptAdded: Signal;
    /**
     * Invoked when a script is removed
     */
    scriptRemoved: Signal;
    /**
     * Invoked when a script is attached to / detached from update.
     * First argument is a reference to script record triggering the change.
     */
    updateAttachChanged: Signal;
    /**
     * Invoked when a creation of a modal window is requested.
     * Receives an instance of {@link PluginUIModal} as first argument during dispatch.
     */
    modalWindowRequested: Signal;
}

/**
 * Class for managing plugins, i.e., user-made scripts extending
 * Catana's functionality.
 */
export default class PluginManager implements IUpdateable {
    private _stage: Stage;
    private _dt: number;
    private _loadedScripts: IScriptRecord[] = [];
    private _loadedPlugins: IPluginRecord[] = [];
    private _sharedVariables: Map<string, any> = new Map();
    private _disposableComponents: Component[] = [];

    /**
     * Default URL where Catana will search for plugins and scripts.
     * Substring {name} will be replaced with the name of the plugin.
     * Substring {file} will be replaced with the name of the script file.
     */
    public readonly defaultRepoUrlTemplate: string = "https://raw.githubusercontent.com/barisicgroup/catana-plugins/main/{name}/{file}";

    public readonly signals: PluginManagerSignals = {
        pluginAdded: new Signal(),
        pluginRemoved: new Signal(),
        scriptAdded: new Signal(),
        scriptRemoved: new Signal(),
        updateAttachChanged: new Signal(),
        modalWindowRequested: new Signal()
    };

    public constructor(stage: Stage) {
        this._stage = stage;

        this._dt = 0;
        this._stage.addUpdateable(this);
    }

    /**
     * This callback is called by the stage and serves 
     * to update update-attached plugins.
     * If an attached plugin fails to execute correctly,
     * it is automatically detached.
     */
    public onUpdate(deltaTime: number): void {
        this._dt = deltaTime;

        for (let i = this._loadedScripts.length - 1; i >= 0; --i) {
            if (this._loadedScripts[i].attachedToUpdate) {
                this._loadedScripts[i].script.run(this._stage).catch(reason => {
                    Log.error(reason);
                    this.detachFromUpdate(this._loadedScripts[i].uuid);
                });
            }
        }
    }

    /**
     * Returns an array of loaded scripts
     */
    public get loadedScripts(): IScriptRecord[] {
        return this._loadedScripts;
    }

    /**
     * Returns an array of loaded plugins
     */
    public get loadedPlugins(): IPluginRecord[] {
        return this._loadedPlugins;
    }

    /**
     * Adds plugin and/or scripts retrieved from the loaded files. 
     * 
     * @param files loaded script or plugin files
     */
    public addFromLoadedFiles(files: FileList): void {
        let plugins: File[] = [];
        let scripts: File[] = [];

        for (let i = 0; i < files.length; ++i) {
            const fi = getFileInfo(files[i]);
            if (fi.ext === PluginExtension) {
                plugins.push(files[i]);
            } else {
                scripts.push(files[i]);
            }
        }

        // If no plugin is included in the loaded files,
        // process all the script files separately.
        if (plugins.length === 0) {
            scripts.forEach(sf => {
                this.addScriptFromFile(sf).catch(Log.error);
            });
        }
        // If a plugin file is included, let the plugin-procesing pipeline
        // decide how some of the scripts will be loaded, and then load the scripts
        // that were not referenced by plugins.
        // ---
        // This code somehow supports loading of multiple plugins at the same time.
        // However, it is primarily intended for loading just a single plugin, 
        // since it does not handle name colisions, etc. (so some "undefined" behavior may happen).
        else {
            const promises = plugins.map(pf =>
                this.addPluginFromFile(pf, scripts).catch(Log.error)
            );
            Promise.all(promises).then(_ => {
                // Note: The scripts array might be different than the original one
                // as it might have been modified in the call above.
                scripts.forEach(sf => {
                    this.addScriptFromFile(sf).catch(Log.error);
                });
            })
                .catch(Log.error);

        }
    }

    /**
     * Adds new plugin loaded from the local file, URL or remote repository
     * 
     * @param file path to plugin file
     * @param scriptFiles files loaded together with the plugin file. 
     * If a script is referenced by the plugin, it is removed from this array.
     */
    public addPluginFromFile(file: LoaderInput, scriptFiles: LoaderInput[] = []): Promise<IPluginRecord | undefined> {
        // If a string is provided but does not seem to be an URL, it is expected to be a name of a plugin
        // stored at the official Catana plugin repository
        if (typeof file === "string" && !file.includes("http")) {
            file = this.getPathToPlugin(file);
        }

        return new Promise<IPluginRecord | undefined>((resolve, reject) => {
            autoLoad(file).then(
                (plugin: IPluginRecord) => {
                    this.addPlugin(plugin, scriptFiles).then(resPlugin => {
                        // At this point, all dependencies and scripts related to this plugin
                        // should be loaded.
                        if (resPlugin.initScript.length > 0) {
                            this.runScriptWithFullName(getFullNameForScopeName(resPlugin.name, resPlugin.initScript));
                        }
                        Log.info("Plugin loaded: " + resPlugin.name);
                        this.signals.pluginAdded.dispatch();
                        resolve(resPlugin);
                    },
                        reject
                    );
                },
                reject
            );
        });
    }

    /**
     * Adds new script loaded from file or URL
     */
    public addScriptFromFile(file: LoaderInput, scope?: string): Promise<IScript | undefined> {
        const name = getFileInfo(file).name;

        return new Promise<IScript | undefined>((resolve, reject) => {
            autoLoad(file).then(
                (script: IScript) => {
                    resolve(this.addScript(script, name, scope));
                },
                reject
            )
        });
    }

    /**
    * Adds new script record
    */
    public addScript(script: IScript, name?: string, scope?: string): IScript {
        const uuid = generateUUID();
        const finName = name ? name : ("plugin_" + uuid.substring(0, uuid.indexOf("-")));
        const finScope = scope ?? "";

        this._loadedScripts.push({
            script: script,
            name: finName,
            scope: finScope,
            uuid: uuid,
            attachedToUpdate: false,
            getFullName: function () {
                return getFullNameForScopeName(this.scope, this.name);
            }
        });

        Log.info("Script loaded: " + finName);
        this.signals.scriptAdded.dispatch();

        return script;
    }

    /**
     * Removes plugin (and related scripts) with the given name.
     */
    private removePlugin(name: string): void {
        // TODO This function is intentionally private at the moment to make it clear
        //      we do not want to make this functionality available "to the outside world".
        //      The reason is that the plugins (resp. their scripts) might create various objects during their lifetime,
        //      such as modal window, components, ..., and these objects would still remain present
        //      even when the plugin is removed (as there is no integrated connection between plugin and these obejcts).
        //      Thus, it is better to avoid removal at this point.
        //      In the end, there are anyway not many reasons (now) why a plugin should be removed.
        const idx = this._loadedPlugins.findIndex(val => val.name === name);
        if (idx >= 0) {
            this._loadedPlugins.splice(idx, 1);
            let scrUuidToRem = this._loadedScripts.filter(x => x.scope === name).map(x => x.uuid);
            scrUuidToRem.forEach(this.removeScript.bind(this));
            this.signals.pluginRemoved.dispatch();
        }
    }

    /**
     * Removes script with the given UUID.
     */
    public removeScript(uuid: string): void {
        const idx = this._loadedScripts.findIndex(val => val.uuid === uuid);
        if (idx >= 0) {
            this._loadedScripts.splice(idx, 1);
            this.signals.scriptRemoved.dispatch();
        }
    }

    /**
     * Returns data stored for plugin with the given name
     */
    public getPlugin(name: string): IPluginRecord | undefined {
        return this._loadedPlugins.find(x => x.name === name);
    }

    /**
     * Returns script instance corresponding to the given UUID.
     */
    public getScript(uuid: string): IScript | undefined {
        const idx = this._loadedScripts.findIndex(val => val.uuid === uuid);
        if (idx >= 0) {
            return this._loadedScripts[idx].script;
        }
        return undefined;
    }

    /**
     * Returns script instance corresponding to the given full name (i.e., scope::name)
     */
    public getScriptByFullName(name: string): IScript | undefined {
        const idx = this._loadedScripts.findIndex(val => val.getFullName() === name);
        if (idx >= 0) {
            return this._loadedScripts[idx].script;
        }
        return undefined;
    }

    /**
     * Returns script record corresponding to the given script name
     * 
     * @param name full name of the script
     */
    public getScriptRecord(name: string): IScriptRecord | undefined {
        return this._loadedScripts.find(x => x.getFullName() === name);
    }

    /**
     * Executes script with the given full name
     * 
     * @param name 
     */
    public runScriptWithFullName(name: string, ...args: any[]): void {
        const scr = this.getScriptByFullName(name);
        if (scr) {
            scr.run(this._stage, args).catch(reason => {
                Log.error("Script execution failed: " + reason);
            });
        } else {
            Log.error("Script not found: " + name);
        }
    }

    /**
     * @returns Map of the existing shared variables and their values
     */
    public get sharedVariables(): Map<string, any> {
        return this._sharedVariables;
    }

    /**
     * Sets new value to the shared variable (varaible shared among plugins/their executions)
     * 
     * @param name variable name
     * @param value value to set
     */
    public setSharedVariable(name: string, value: any): void {
        this._sharedVariables.set(name, value);
    }

    /**
     * Returns contents of the specified shared variable
     * 
     * @param name variable name
     * @returns value of the variable or null
     */
    public getSharedVariable(name: string): any {
        return this._sharedVariables.get(name) ?? null;
    }

    /**
     * Returns true if the given shared variable is defined, false otherwise
     * 
     * @param name name of the shared variable to look for
     * @returns boolean determining whether the variable is defined or not
     */
    public hasSharedVariable(name: string): boolean {
        return this._sharedVariables.has(name);
    }

    /**
     * Removes given shared variable
     * 
     * @param name variable to remove
     * @returns true if the variable existed and was removed, false otherwise
     */
    public removeSharedVariable(name: string): boolean {
        return this._sharedVariables.delete(name);
    }

    /**
    * Returns delta time, i.e., time since the last update call.
    * 
    * @returns delta time value
    */
    public getDeltaTime(): number {
        return this._dt;
    }

    /**
     * Adds new component to the list of disposable components.
     * Components marked disposable might be easily removed by plugins/scripts
     * using a single call to {@link removeDisposableComponents}
     * @param comp component to add
     */
    public addDisposableComponent(comp: Component): void {
        this._disposableComponents.push(comp);
    }

    /**
     * Removes all disposable components from the stage
     */
    public removeDisposableComponents(): void {
        for (let i = 0; i < this._disposableComponents.length; ++i) {
            this._stage.removeComponent(this._disposableComponents[i]);
        }
        this._disposableComponents = [];
    }

    /**
     * Attaches given plugin to the update, i.e., its script
     * will be executed with every {@link onUpdate} call. 
     * 
     * @param uuid plugin´s UUID
     */
    public attachToUpdate(uuid: string): void {
        this.changeUpdateAttachStatus(uuid, true);
    }

    /**
     * Detaches given plugin from the update function.
     * 
     * @param uuid plugin´s UUID
     */
    public detachFromUpdate(uuid: string): void {
        this.changeUpdateAttachStatus(uuid, false);
    }

    /**
     * Creates new script instance with the given code.
     * Does not automatically load it, i.e., add it to plugins.
     */
    public getScriptInstance(code: string, scriptType: "js" | "jspy"): IScript {
        if (scriptType === "js") {
            return new JSScript(code, "user_script", "");
        }
        return new JSPyScript(code);
    }

    /**
     * Returns an array of JSPy API functions.
     */
    public getJsPyApiFunctions(): string[] {
        const funcList = ScriptingApi.getFunctionsList();
        return funcList.map(x => x[0]);
    }

    /**
    * Creates a request to create a new Modal window with the given content.
    * 
    * @param title title of the modal window
    * @param uiElements elements to show in the window
    */
    public addModalWindow(title: string, uiElements: PluginUIElemTypeRecord[]): void {
        for (let i = 0; i < uiElements.length; ++i) {
            if (!isValidPluginUIElemTypeRecord(uiElements[i])) {
                Log.error("Invalid UI element request: " + uiElements[i]);
                return;
            }
        }

        const newModal: PluginUIModal = {
            title: title,
            elements: uiElements
        };

        this.signals.modalWindowRequested.dispatch(newModal);
    }

    /**
     * Adds new plugin record by acquiring necessary dependencies and loading the needed scripts
     */
    private addPlugin(plugin: IPluginRecord, scriptFiles: LoaderInput[]): Promise<IPluginRecord> {
        return new Promise((resolve, reject) => {
            if (this.getPlugin(plugin.name) !== undefined) {
                this.removePlugin(plugin.name);
                Log.warn("Replacing plugin with the same name.");
            }

            // Promises resolving to dependencies or scripts installed together with this plugin 
            const reqPromises: Promise<any>[] = [];

            const scripts = plugin.scripts;
            const scriptsUrlTemplate = plugin.thisUrlTemplate.length > 0 ?
                plugin.thisUrlTemplate : this.defaultRepoUrlTemplate;

            const deps = plugin.dependencies;
            const depsUrlTemplate = plugin.depsUrlTemplate.length > 0 ?
                plugin.depsUrlTemplate : scriptsUrlTemplate;

            for (let i = 0; i < deps.length; ++i) {
                const path = this.getPathToPlugin(deps[i], depsUrlTemplate);
                reqPromises.push(this.addPluginFromFile(path));
            }

            // Scripts can be either retrieved from the uploaded file 
            // or downloaded from the remote repository
            for (let i = 0; i < scripts.length; ++i) {
                let isUploaded = false;

                for (let j = 0; j < scriptFiles.length; ++j) {
                    const fn = getFileInfo(scriptFiles[j]).name;
                    if (fn === scripts[i]) {
                        reqPromises.push(this.addScriptFromFile(scriptFiles[j], plugin.name));
                        scriptFiles.splice(j, 1);
                        isUploaded = true;
                        break;
                    }
                }

                if (!isUploaded) {
                    const path = this.getPathToScript(plugin.name, scripts[i], scriptsUrlTemplate);
                    reqPromises.push(this.addScriptFromFile(path, plugin.name));
                }
            }

            return Promise.all(reqPromises).then((_ => {
                this._loadedPlugins.push(plugin);
                resolve(plugin);
            })).catch(r => reject("Error when retrieving plugin files." + r));
        });
    }

    private changeUpdateAttachStatus(uuid: string, status: boolean): void {
        const idx = this._loadedScripts.findIndex(val => val.uuid === uuid);
        if (idx >= 0) {
            const s = this._loadedScripts[idx];
            s.attachedToUpdate = status;
            this.signals.updateAttachChanged.dispatch(s);
        }
    }

    private getPathToPlugin(pluginName: string, urlTemplate: string = this.defaultRepoUrlTemplate): string {
        return urlTemplate
            .replace(/\{name\}/g, pluginName)
            .replace(/\{file\}/g, pluginName + "." + PluginExtension);
    }

    private getPathToScript(pluginName: string, scriptName: string, urlTemplate: string = this.defaultRepoUrlTemplate): string {
        return urlTemplate
            .replace(/\{name\}/g, pluginName)
            .replace(/\{file\}/g, scriptName);
    }
}

/**
 * Returns full name for the given script scope and name combination
 */
function getFullNameForScopeName(scope: string, name: string): string {
    return scope.length > 0 ? (scope + "::" + name) : name;
}