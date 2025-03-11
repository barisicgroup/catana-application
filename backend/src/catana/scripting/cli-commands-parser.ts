import { Stage } from "../../catana";
import JSPyScript from "./jspyscript";
import ScriptingApi from "./scripting-api";

/**
 * List of special CLI-only commands
 */
enum CLICommands {
    HELP,
    LIST
}

const CommandsRegexps: { [id in CLICommands]: string } = {
    [CLICommands.HELP]: "help(.*)",
    [CLICommands.LIST]: "list"
}

const CommandsDescriptions: { [id in CLICommands]: string } = {
    [CLICommands.HELP]: "Lists all available commands.",
    [CLICommands.LIST]: "Lists all components loaded in the scene and their UUID."
}

/**
 * Class managing the execution of commands via Catana's CLI
 */
class CLICommandsParser {
    private _stage: Stage;

    constructor(stage: Stage) {
        this._stage = stage;
    }

    public executeCommand(commandString: string): Promise<string> {
        commandString = commandString.trim();

        return new Promise((resolve, reject) => {
            let commandRegexToExecute: string = "";

            for (let command in CommandsRegexps) {
                const comRegex = CommandsRegexps[command as unknown as CLICommands];
                if (new RegExp(comRegex).test(commandString)) {
                    commandRegexToExecute = comRegex;
                    break;
                }
            }

            // If no command in CLI-specific ones is found, interpret command as JSPython script.
            if (commandRegexToExecute.length === 0) {
                new JSPyScript(commandString).run(this._stage).then((val: any) => {
                    // We resolve with the returned value only if it is defined and primitive type
                    if (val !== undefined && val !== Object(val)) {
                        resolve(val);
                    } else {
                        resolve("");
                    }
                }, reject);
            } else {
                this.processCommand(commandString, commandRegexToExecute).then(resolve, reject).catch((reason) => {
                    reject("Failure when parsing command: " + commandString + "\n\t" + reason);
                });
            }
        });
    }

    private processCommand(commandString: string, commandToExecute: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (commandToExecute === CommandsRegexps[CLICommands.HELP]) {
                let result = "";
                let cmdPattern = commandString.substring(4).trim().toLowerCase();

                // Include CLI commands
                for (let key in CommandsRegexps) {
                    const name = CommandsRegexps[key as unknown as CLICommands];
                    if (cmdPattern.length === 0 || name.startsWith(cmdPattern)) {
                        result += name + "\t-\t" + CommandsDescriptions[key as unknown as CLICommands] + "\n";
                    }
                }

                // Append JSPy functions
                const jsPyFuncs = ScriptingApi.getFunctionsList();
                for (let func of jsPyFuncs) {
                    if (cmdPattern.length === 0 || func[0].startsWith(cmdPattern)) {
                        result += func[0] + "\t-\t" + func[1] + "\n";
                    }
                }

                resolve(result);
            } else if (commandToExecute === CommandsRegexps[CLICommands.LIST]) {
                let result = "UUID | component name\n";
                this._stage.compList.forEach(comp => {
                    result += comp.uuid + " | " + comp.name + "\n";
                });
                resolve(result);
            } else {
                reject("Following command is not implemented: " + commandToExecute);
            }
        });
    }
}

export default CLICommandsParser;