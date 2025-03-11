import { Component, Stage } from "../catana";
import AddComponentCommand from "./history/c-add-component";
import { AminoAcidStructuresProvider } from "./nanomodeling/structure-providers/amino-acid-structures-provider";
import NucleicAcidStructuresProvider from "./nanomodeling/structure-providers/nucleic-acid-structures-provider";
import ScriptingApi from "./scripting/scripting-api";

/**
 * This function is called at the end of a Stage constructor, i.e.,
 * automatically during the application start
 */
export function initialize(stage: Stage) {
    // Preloading reference structures
    // to make them available when needed later on
    // ==
    // The empty catch here is purely because of build pipeline.
    // When the project is being built, browser window gets refreshed
    // and the "initialize" function repeatedly called.
    // At some point, the structure files are removed and replaced.
    // When the refresh "hits" this point, exception is thrown
    // because the file is not found. In final build, these issues do not occur
    // as the files simply exist.
    NucleicAcidStructuresProvider.loadStructures().then((result) => { }, (rej) => { }).catch((err) => { });
    AminoAcidStructuresProvider.loadAminoAcids().then((result) => { }, (rej) => { }).catch((err) => { });

    ScriptingApi.init(stage);

    stage.signals.componentAdded.add(onComponentAdded);
}

function onComponentAdded(component: Component) {
    if (!component.backendOnly) {
        component.stage.catanaHistory.do(new AddComponentCommand(component.stage, [component]));
    }
}