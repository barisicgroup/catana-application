import Loader from "../../loader/loader";
import JsonParser from "../../parser/json-parser";
import { IPluginRecord } from "../scripting/iplugin-record";

/**
 * Plugin loader class
 */
class PluginLoader extends Loader {
    /**
     * Loads given plugin file
     * 
     * @returns promise resolving to the loaded plugin record
     */
    public load(): Promise<IPluginRecord> {
        const parser = new JsonParser(this.streamer, { string: true });
        return new Promise<IPluginRecord>((resolve, reject) => {
            parser.parse().then(json => {
                const pr = json.data as IPluginRecord;
                if (this.validatePluginRecord(pr)) {
                    resolve(pr);
                } else {
                    reject("File with the plugin definition is in incorrect format: " + pr);
                }
            }).catch(reject);
        });
    }

    /**
     * Validates that the parsed object contains all the required fields.
     */
    private validatePluginRecord(pr: any): boolean {
        return pr.name !== undefined &&
            pr.description !== undefined &&
            pr.version !== undefined &&
            pr.author !== undefined &&
            pr.thisUrlTemplate !== undefined &&
            pr.depsUrlTemplate !== undefined &&
            pr.scripts !== undefined &&
            pr.initScript !== undefined &&
            pr.dependencies !== undefined;
    }
}

export default PluginLoader;