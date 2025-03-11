import { Interpreter, jsPython } from "jspython-interpreter";
import { Stage } from "../../catana";
import { IScript } from "../../script";
import ScriptingApi from "./scripting-api";

/**
 * Class for executing scripts written in JSPython.
 * @see https://www.jspython.dev/
 */
export default class JSPyScript implements IScript {
    private _interpreter: Interpreter;
    private _scriptBody: string;

    /**
     * Creates a script instance
     * 
     * @param scriptBody code of the script
     */
    public constructor(scriptBody: string) {
        this._interpreter = jsPython();
        this._scriptBody = scriptBody;

        // Add API functions
        const apiFuncs = ScriptingApi.getFunctionsList();
        for (let f of apiFuncs) {
            this._interpreter.addFunction(f[0], f[2]);
        }

        // Add other functions
        // ---
        // NOTE: The functions names must be written using string and not "function.name"
        //       because terser (plugin minifying the code in release build) changes the function
        //       names to shorter versions and thus would change also the name we want to use
        //       in JSPy script!
        this._interpreter.addFunction("len", len);
        this._interpreter.addFunction("int", int);
        this._interpreter.addFunction("float", float);
        this._interpreter.addFunction("str", str);
    }

    public run(stage: Stage, args?: any[]): Promise<unknown> {
        const context = {
            stage: stage,
            __this: this,
            args: args ?? [],
            // Since JSPython does not apparently support Python-style
            // "True", "False", and "None" instead of its JS equivalents,
            // we "hardcode" these constructs as context, for simplicity.
            True: true,
            False: false,
            None: null,
            // JSPython does not support Python's "global" keyword, thus it is not possible
            // to easily modify global variable in a function (e.g., callback).
            // We currently solve this by providing empty "global" object as a context,
            // allowing users to create and read their own properties on this object.
            global: {}
        };
        return this._interpreter.evaluate(this._scriptBody, context);
    }
}

// Define selected JSPy-only functions bringing some functionality
// common in Python, but not available in JSPy, to JSPy.
function len(data: any): number {
    return data.length;
}

function int(text: string): number {
    return parseInt(text);
}

function float(text: string): number {
    return parseFloat(text);
}

function str(input: number): string {
    return String(input);
}