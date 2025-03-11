import { IScript } from "../../script";

/**
 * Data type corresponding to the information stored
 * for each loaded script (loaded = stored in memory and thus available for a repeated execution).
 */
export interface IScriptRecord {
    /**
     * Reference to the underlying script object
     */
    script: IScript;
    /**
     * Script scope (equals to the name of the plugin it belongs to or to empty string if it refers to "global scope")
     */
    scope: string;
    /**
     * Script name
     */
    name: string;
    /**
     * UUID of this script
     */
    uuid: string;
    /**
     * Determines whether this script is attached to the update or not.
     * Should be modified via {@link PluginManager.attachToUpdate} and {@link PluginManager.detachFromUpdate}.
     */
    attachedToUpdate: boolean;

    /**
     * Returns full name identification of this script record (including the scope specification).
     */
    getFullName(): string;
}
