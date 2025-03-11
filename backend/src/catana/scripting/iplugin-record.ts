/**
 * Data type corresponding to the information stored
 * for each loaded plugin.
 * Provides one-to-one mapping with the plugin's JSON file.
 */
export interface IPluginRecord {
    /**
     * Name of the plugin
     * The name must be lowercase, single-word (i.e., no spaces), and may contain hyphens and underscores.
     */
    name: string;
    /**
     * Description of the plugin
     */
    description: string;
    /**
     * Plugin version
     */
    version: string;
    /**
     * Author of the plugin
     */
    author: string;
    /**
     * URL template for retrieving files of this plugin.
     * Substring {name} will be replaced with the name of the plugin (defined in {@link name} field).
     * Substring {file} will be replaced with the name of the script file (defined in {@link scripts} field).
     */
    thisUrlTemplate: string;
    /**
     * URL template for retrieving addresses of dependencies.
     * If empty, {@link thisUrlTemplate} is used.
     */
    depsUrlTemplate: string;
    /**
     * Names of scripts included in this plugin.
     */
    scripts: string[];
    /**
     * Name of the script (from {@link scripts}) to be automatically executed when the plugin is loaded.
     */
    initScript: string;
    /**
     * Names of the plugins this plugin depends on.
     */
    dependencies: string[];
}
