import { PLUGINS_LOCAL_STORAGE } from "./constants";
import Globals from "./globals";
import LocalStorage from "./local-storage";

// Source: https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>
    (obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop)
}

export function getCurrentTimeFormatted() {
    const now = new Date();
    /*const date = "" + now.getDate();
    let dateTh; {
        const lastNum = date.charAt(date.length - 1);
        dateTh = lastNum === "1" ? "st" : (lastNum === "2" ? "nd" : lastNum === "3" ? "rd" : "th");
    }
    return date + dateTh + " of " + (now.getMonth()+1) + ", " + now.getFullYear() +
        ", " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();*/
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return now.toLocaleDateString("en-GB", options) + ", " + now.toLocaleTimeString();
}

export function openLink(url: string, newTab: boolean = true) {
    if (newTab) window.open(url, "_blank");
    else window.open(url);
}

// Source: https://www.petermorlion.com/iterating-a-typescript-enum/
export function forEachEnumValue<O extends object, K extends keyof O = keyof O>(obj: O, callback: (k: K) => void) {
    (Object.keys(obj).filter(k => Number.isNaN(+k)) as K[]).forEach(callback);
}

export function getLastSessionPlugins(): string[] {
    const ls = new LocalStorage<string>(PLUGINS_LOCAL_STORAGE);
    const names = ls.get("");
    if (names.length > 0) {
        const namesSplit = names.split(",");
        return namesSplit;
    }
    return [];
}

export function setLastSessionPlugins(plugNames: string[]): void {
    const ls = new LocalStorage<string>(PLUGINS_LOCAL_STORAGE);
    ls.set(plugNames.join(","));
}

/**
 * Processes input source code and performs simple highlight by appending "span" tags with the corresponding 
 * class name.
 * 
 * @param code code to highlight
 * @param lang programming language
 * 
 * Based on the following source:
 * @see https://idiallo.com/blog/javascript-syntax-highlighter
 */
export function highlightCode(code: string, lang: "jspy" | "js"): string {
    // Define regular expressions identifying corresponding code parts

    let stringDblQuoteRegex: RegExp = new RegExp(/(".*?")/g);
    let stringSnglQuoteRegex: RegExp = new RegExp(/('.*?')/g);
    let snglLineCommentRegex: RegExp;
    let multiLineCommentRegex: RegExp;
    let keywordsRegex: RegExp;
    let globalObjsRegex: RegExp;
    let apiFuncsRegex: RegExp;

    if (lang === "js") {
        snglLineCommentRegex = new RegExp(/(\/\/.*)/g);
        multiLineCommentRegex = new RegExp(/(\/\*[^]*?\*\/)/g);
        keywordsRegex = new RegExp(/\b(new|var|let|if|do|function|while|switch|return|case|for|foreach|in|continue|break)(?=[^\w])/g);
        globalObjsRegex = new RegExp(/\b(document|window|Array|String|Object|Number|Math|\$)(?=[^\w])/g);
        apiFuncsRegex = new RegExp(/\b(stage|args|scriptingApi|log|__this|\$)(?=[^\w])/g);
    } else {
        snglLineCommentRegex = new RegExp(/(#.*)/g);
        // TODO Multiline comments collide with regular double-quoted strings
        //      when coloring, they are thus not colored now (and "always negative" regex is used) 
        multiLineCommentRegex = new RegExp(/(?!x)x/g); //new RegExp(/(\"\"\"[^]*?\"\"\")/g);
        keywordsRegex = new RegExp(/\b(False|None|True|and|as|assert|async|await|break|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)(?=[^\w])/g);
        globalObjsRegex = new RegExp(/\b(Math|dateTime|\$)(?=[^\w])/g);

        const apiCalls = Globals.stage.pluginManager.getJsPyApiFunctions().join("|");
        apiFuncsRegex = new RegExp("\\b(" + apiCalls + "|stage|args|__this|\\$)(?=[^\\w])", "g");
    }

    // Assing class names to captured regexes

    let parsed = code;
    let spanWithClass = (cn: string) => `<span class="${cn}">$1</span>`;

    parsed = parsed.replace(stringDblQuoteRegex, spanWithClass("code_string"));
    parsed = parsed.replace(stringSnglQuoteRegex, spanWithClass("code_string"));
    parsed = parsed.replace(snglLineCommentRegex, spanWithClass("code_comment"));
    parsed = parsed.replace(multiLineCommentRegex, spanWithClass("code_comment"));
    parsed = parsed.replace(keywordsRegex, spanWithClass("code_keywords"));
    parsed = parsed.replace(globalObjsRegex, spanWithClass("code_globalobjs"));
    parsed = parsed.replace(apiFuncsRegex, spanWithClass("code_apifuncs"));

    return parsed;
}
