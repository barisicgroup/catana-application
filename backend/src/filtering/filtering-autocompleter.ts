/**
 * The functions exported here take care of:
 * - Suggesting filtering options based on a given string,
 * - Applying a suggestion to an existing filter string, and
 * - Listing valid keywords given a component
 *
 * This is useful for a GUI filter component that suggests autocompletions for the typed text (see frontend/src/ts/elements/complex/input-autocomplete.ts)
 *
 * TODO: THERE IS A BIG PROBLEM IN HOW THE AUTOCOMPLETE WORKS!
 * KwdsGeneral use the keyword display names as keys (like ": (chain)")
 * Also KwdsGeneralDescriptions...
 * This kind of stuff should be done in the UI side of things <- this is the problem
 */

import {k, KeywordDescriptions, Keywords, kwd, MoreKeywordDescriptions} from "./filtering-constants";
import Component from "../component/component";
import StructureComponent from "../component/structure-component";
import CgStructureComponent from "../catana/component/cg-structure-component";

const KwdsGeneral: {[id: string]: string} = {};
const KwdsGeneralDescriptions: {[id: string]: string} = {};
//const KwdsAtomList: {[id: string]: string} = {};
//const KwdsResList: {[id: string]: string} = {};
//const KwdsResidues = ["ALA", "ARG", "ASN", "ASP", "CYS", "GLU", "GLN", "GLX", "GLY", "HIS", "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL"];
//const KwdsAtom: {[id: string]: string} = {};
//const KwdsChain: {[id: string]: string} = {};

for (let id_str in Keywords) {
    const id: k = Number(id_str);
    if (id === null) throw new Error("This should never have happened! ID " + id + " could not be converted to a number");
    let kwd: string = Keywords[id];
    const translation = kwd;
    switch (kwd) {
        case Keywords[k.SEPARATOR]: continue;
        case Keywords[k.PAR_L]: continue;
        case Keywords[k.PAR_R]: continue;
        case Keywords[k.INSCODE_NEGATE]: continue;
        case Keywords[k.INSCODE_NEGATE2]: continue;
        case Keywords[k.ATOMLIST]: kwd = Keywords[k.ATOMLIST] + " (atomlist)"; break;
        case Keywords[k.ATOM_DEPRECATED]: continue;
        case Keywords[k.ELEMENT]: kwd = Keywords[k.ELEMENT] + " (atom)"; break;
        case Keywords[k.RESLIST_START]: kwd = Keywords[k.RESLIST_START] + " (startresiduelist)"; break;
        case Keywords[k.RESLIST_END]: continue;//kwd = Keywords[k.RESLIST_END] + " (endresiduelist)"; break;
        case Keywords[k.MODEL]: kwd = Keywords[k.MODEL] + " (model)"; break;
        case Keywords[k.ALTLOC]: kwd = Keywords[k.ALTLOC] + " (alternatelocation)"; break;
        case Keywords[k.ATOMNAME]: kwd = Keywords[k.ATOMNAME] + " (atomname)"; break;
        case Keywords[k.CHAIN]: kwd = Keywords[k.CHAIN] + " (chain)"; break;
        case Keywords[k.INSCODE]: kwd = Keywords[k.INSCODE] + " (inscode)"; break;
        default: // Do nothing
    }
    KwdsGeneral[kwd] = translation;
    KwdsGeneralDescriptions[kwd] = KeywordDescriptions[id];
}

for (let key_str in kwd) {
    const key: kwd = Number(key_str);
    if (!isNaN(key)) { // If key is a number
        key_str = kwd[key];
        KwdsGeneral[key_str] = key_str;
        KwdsGeneralDescriptions[key_str] = MoreKeywordDescriptions[key];
    }
}

function getChains(component: Component, maxSuggestions?: number): string[] {
    const chains: string[] = [];
    if (component instanceof StructureComponent) {
        component.structure.eachChain((cp) => {
            if (chains.length === maxSuggestions) return;
            const chainname = cp.chainname;
            if (!chains.includes(chainname)) chains.push(chainname);
        });
    } else if (component instanceof CgStructureComponent) {
        component.cgStructure.forEachPolymer((p) => {
            if (chains.length === maxSuggestions) return;
            const chainname = p.name;
            if (!chains.includes(chainname)) chains.push(chainname);
        });
    }
    return chains;
}

function getResidues(component: Component, maxSuggestions?: number): string[] {
    const residues: string[] = [];
    if (component instanceof StructureComponent) {
        component.structure.eachResidue((rp) => {
            if (residues.length === maxSuggestions) return;
            const resname = rp.resname;
            if (!residues.includes(resname)) residues.push(resname);
        });
    } else if (component instanceof CgStructureComponent) {
        component.cgStructure.forEachMonomer((mp) => {
            if (residues.length === maxSuggestions) return;
            const resname = mp.residueName;
            if (!residues.includes(resname)) residues.push(resname);
        });
    }
    return residues;
}

function getModels(component: Component, maxSuggestions?: number): string[] {
    const models: string[] = [];
    if (component instanceof StructureComponent) {
        component.structure.eachModel((mp) => {
            if (models.length === maxSuggestions) return;
            const index = "" + mp.index;
            if (!models.includes(index)) models.push(index);
        });
    }
    return models;
}

function getAtoms(component: Component, maxSuggestions?: number): string[] {
    const atoms: string[] = [];
    if (component instanceof StructureComponent) {
        const map = component.structure.atomMap;
        for (let i = 0; i < map.count; ++i) {
            if (atoms.length === maxSuggestions) return atoms;
            const at = map.get(i); // AtomType
            const atomname = at.atomname;
            if (!atoms.includes(atomname)) atoms.push(atomname);
        }
    }
    return atoms;
}

function getElements(component: Component, maxSuggestions?: number): string[] {
    const elements: string[] = [];
    if (component instanceof StructureComponent) {
        const map = component.structure.atomMap;
        for (let i = 0; i < map.count; ++i) {
            if (elements.length === maxSuggestions) return elements;
            const at = map.get(i); // AtomType
            const element = at.element;
            if (!elements.includes(element)) elements.push(element);
        }
    }
    return elements;
}

function match(str: string, list: string[], maxSuggestions?: number) {
    if (str === "") {
        if (maxSuggestions && list.length > maxSuggestions) list.length = maxSuggestions;
        return list;
    }
    str = str.toUpperCase();
    const matches: string[] = [];
    const indexes: number[] = [];
    for (let str2 of list) {
        const index = str2.toUpperCase().indexOf(str);
        if (index !== -1) { // If string was found
            matches.push(str2);
            indexes.push(index);
            if (matches.length === maxSuggestions) break;
        }
    }
    matches.sort((a, b) => { // Matches that appear closer to the start have priority
        const ia = matches.indexOf(a);
        const ib = matches.indexOf(b);
        return indexes[ia] - indexes[ib];
    });
    return matches;
}

function isExactMatch(str: string, list: string[]): boolean {
    return list.length === 1 && list[0].toUpperCase() === str.toUpperCase();
}

function hasExactMatch(str: string, list: string[]): boolean {
    str = str.toUpperCase();
    for (let s of list) if (str === s.toUpperCase()) return true;
    return false;
}

export function getSuggestions(filterStr: string, component?: Component, maxSuggestions?: number): null | string[] {
    if (maxSuggestions === undefined) console.warn("Parameter 'maxSuggestions' in function 'autocomplete' should probably not be undefined");

    if (filterStr === "" || filterStr.endsWith(" ")) return match("", Object.keys(KwdsGeneral), maxSuggestions);

    // Source: https://stackoverflow.com/questions/20497264/string-split-and-get-first-and-last-occurrences
    const splitIndex = filterStr.lastIndexOf(" ");
    let rule = filterStr.slice(splitIndex+1); // Get last part/rule of filter

    if (rule.endsWith(Keywords[k.RESLIST_END])) return null;
    if (rule.endsWith(Keywords[k.PAR_R])) return null;

    let suggestions: null | string[] = null;

    const _getSuggestions = (_fun: (c: Component) => string[], _rule?: string, _exactMatch: null | string[] = null): void => {
        if (component) {
            if (_rule === undefined) _rule = rule.slice(1);
            suggestions = match(_rule, _fun(component), maxSuggestions);
            if (isExactMatch(_rule, suggestions)) {
                suggestions = _exactMatch;
            } else if (_exactMatch && hasExactMatch(_rule, suggestions)) {
                const s = [];
                for (let em of _exactMatch) {
                    if (!suggestions.includes(em)) {
                        s.push(em);
                    }
                }
                suggestions = s.concat(suggestions);
                if (maxSuggestions !== undefined && suggestions.length > maxSuggestions) {
                    suggestions.length = maxSuggestions;
                }
            }
        }
    };

    const _getSuggestionsSeparator = (_fun: (c: Component) => string[], _exactMatch: null | string[] = null): void => {
        if (component) {
            const si = rule.lastIndexOf(Keywords[k.SEPARATOR]);
            const _rule = rule.slice(si === -1 ? 1 : si+1);
            _getSuggestions(_fun, _rule, _exactMatch);
        }
    };

    if (rule.startsWith(Keywords[k.RESLIST_START])) { // [
        _getSuggestionsSeparator(getResidues, [Keywords[k.SEPARATOR], Keywords[k.RESLIST_END]]);

    } else if (rule.startsWith(Keywords[k.ATOMLIST])) { // @
        _getSuggestionsSeparator(getAtoms, [Keywords[k.SEPARATOR]]);

    } else if (rule.startsWith(Keywords[k.CHAIN])) { // :
        _getSuggestions(getChains);

    } else if (rule.startsWith(Keywords[k.ELEMENT])) { // _
        _getSuggestions(getElements);

    } else if (rule.startsWith(Keywords[k.MODEL])) { // /
        _getSuggestions(getModels);

    } else if (rule.startsWith(Keywords[k.ATOMNAME])) { // .
        _getSuggestions(getAtoms);

    } else if (rule.startsWith(Keywords[k.INSCODE])) { // ^
        return null; // TODO

    } else {
        suggestions = match(rule, Object.keys(KwdsGeneral), maxSuggestions);
    }

    //return options ? Object.assign([], options) : null; // Cloned array
    return suggestions;
}

export function applySuggestion(suggestion: string, filterStr: string): string {
    if (suggestion in KwdsGeneral) suggestion = KwdsGeneral[suggestion];

    if (suggestion === Keywords[k.SEPARATOR] || suggestion === Keywords[k.RESLIST_END]) {
        return filterStr + suggestion;
    }

    const index = filterStr.lastIndexOf(" ") + 1;
    let firstPart = filterStr.slice(0, index);
    const secondPart = filterStr.slice(index);

    const firstChar = secondPart.charAt(0);
    switch (firstChar) {
        // Lists
        case Keywords[k.RESLIST_START]:
        case Keywords[k.ATOMLIST]:
            const index2 = secondPart.lastIndexOf(Keywords[k.SEPARATOR]) + 1;
            if (index2 > 0) {
                const firstPart2 = secondPart.slice(0, index2);
                //const secondPart2 = secondPart.slice(index);
                firstPart += firstPart2;
            } else {
                firstPart += firstChar;
            }
            break;
        // Non-lists
        case Keywords[k.PAR_L]:
        case Keywords[k.CHAIN]:
        case Keywords[k.ELEMENT]:
        case Keywords[k.MODEL]:
        case Keywords[k.ATOMNAME]:
        case Keywords[k.INSCODE]:
            firstPart += firstChar;
            break;
    }

    return firstPart + suggestion;
}

// TODO: DisplayName and Description should be done in the UI side of things... not here!!!
export interface KeywordObject {
    keyword: string,
    keywordDisplayName: string,
    description: string
}

export function getKeywords(component?: Component): {[id: string]: KeywordObject[]} {
    const keywords: {[id: string]: KeywordObject[]} = {};

    keywords.general = [];
    for (let kwdDisplayName in KwdsGeneral) {
        const kwd = KwdsGeneral[kwdDisplayName];
        keywords.general.push({keyword: kwd, keywordDisplayName: kwdDisplayName, description: KwdsGeneralDescriptions[kwdDisplayName]});
    }

    if (component) {
        const _createKeywordObject = function(keywords: string[], prefix: string, suffix?: string): KeywordObject[] {
            const objects: KeywordObject[] = [];
            for (let kwd of keywords) {
                objects.push({keyword: kwd, keywordDisplayName: kwd, description: prefix + kwd + (suffix ? suffix : "")});
            }
            return objects;
        }
        const chains = _createKeywordObject(getChains(component), "Chain " + Keywords[k.CHAIN]);
        const residues = _createKeywordObject(getResidues(component), "Residue " + Keywords[k.RESLIST_START], Keywords[k.RESLIST_END]);
        const models = _createKeywordObject(getModels(component), "Model " + Keywords[k.MODEL]);
        const atoms = _createKeywordObject(getAtoms(component), "Atom " + Keywords[k.ATOMNAME]);
        const elements = _createKeywordObject(getElements(component), "Element " + Keywords[k.ELEMENT]);
        if (chains.length > 0) keywords.chains = chains;
        if (residues.length > 0) keywords.residues = residues;
        if (models.length > 0) keywords.models = models;
        if (atoms.length > 0) keywords.atoms = atoms;
        if (elements.length > 0) keywords.elements = elements;
    }
    return keywords;
}