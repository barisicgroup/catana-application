import ScriptingApi from "./scripting-api";

/**
 * Converts function name to Snake Case (snake_case)
 * to have more Python-like naming convention.
 */
function functionNameToSnakeCase(fn: any): string {
    let origName = fn.name as string;
    let newName = "";

    for (let i = 0; i < origName.length; ++i) {
        const char = origName[i];
        const isUpper = char === char.toUpperCase();

        if (isUpper) {
            newName += "_" + char.toLowerCase();
        } else {
            newName += char;
        }
    }

    return newName;
}

/**
 * Returns an array of three-element tuples:
 * - function name for JSPython (e.g., "add")
 * - function description (e.g., "Returns sum of two provided numbers") 
 * - reference to function itself
 */
export function getApiFunctionsList(): [string, string, (...args: any) => any][] {
    // This code is intentionally in a function and not just as a global variable
    // to avoid circular dependency issues.
    // TODO Add usage examples / type info to the textual functions description
    const scripting_api_funcs_desc: [(...args: any) => any, string][] = [
        [
            ScriptingApi.log,
            "Logs a text message that will be captured by Catana.",
        ],
        [
            ScriptingApi.getAtomGenLimit,
            "Returns the maximum number of atoms that can be generated."
        ],
        [
            ScriptingApi.setAtomGenLimit,
            "Sets new upper bound for the number of atoms that can be generated."
        ],
        [
            ScriptingApi.fetchRcsb,
            "Fetches structure with the given PDB ID.",
        ],
        [
            ScriptingApi.fetchPubchem,
            "Fetches structure with the given PubChem CID."
        ],
        [
            ScriptingApi.fetchUrl,
            "Fetches structure from the provided URL."
        ],
        [
            ScriptingApi.getComponents,
            "Returns an array with all currently loaded components."
        ],
        [
            ScriptingApi.getStructuralComponents,
            "Returns an array with all structure-referencing loaded components."
        ],
        [
            ScriptingApi.getComponentUuid,
            "Returns the UUID of the given component."
        ],
        [
            ScriptingApi.findComponentWithUuid,
            "Finds component with the corresponding UUID."
        ],
        [
            ScriptingApi.findComponentWithName,
            "Finds component with the corresponding name."
        ],
        [
            ScriptingApi.setComponentName,
            "Sets new name for the given component."
        ],
        [
            ScriptingApi.setVisibility,
            "Sets the visibility of the provided component or representation."
        ],
        [
            ScriptingApi.getComponentName,
            "Returns name of the given component."
        ],
        [
            ScriptingApi.focusOnComponent,
            "Centers view onto the provided component."
        ],
        [
            ScriptingApi.copyComponent,
            "Duplicates provided component."
        ],
        [
            ScriptingApi.removeComponent,
            "Removes provided component."
        ],
        [
            ScriptingApi.removeAllComponents,
            "Remove all components from the scene."
        ],
        [
            ScriptingApi.getComponentPosition,
            "Returns position of this component."
        ],
        [
            ScriptingApi.getComponentRotation,
            "Returns rotation of this component."
        ],
        [
            ScriptingApi.translateComponent,
            "Translates provided component by the given amount of Angstroms."
        ],
        [
            ScriptingApi.setComponentPosition,
            "Sets new position for the component's."
        ],
        [
            ScriptingApi.rotateComponent,
            "Rotates component by the given amount in degrees."
        ],
        [
            ScriptingApi.setComponentRotation,
            "Sets new rotation (in degress) for the component."
        ],
        [
            ScriptingApi.getStructureFromComponent,
            "Returns structure represented by this component."
        ],
        [
            ScriptingApi.getComponentSequence,
            "Returns FASTA-formatted sequence of this component's structure."
        ],
        [
            ScriptingApi.removeComponentRepresentations,
            "Removes all representations from the component."
        ],
        [
            ScriptingApi.addRepresentationToComponent,
            "Adds new representation to the component."
        ],
        [
            ScriptingApi.setRepresentationFilter,
            "Sets filter string for the selected component's representation."
        ],
        [
            ScriptingApi.setRepresentationColor,
            "Sets color (scheme) for the selected component's representation."
        ],
        [
            ScriptingApi.createSsDna,
            "Creates single-stranded DNA with the given sequence."
        ],
        [
            ScriptingApi.createDsDna,
            "Creates double-stranded DNA with the given sequence."
        ],
        [
            ScriptingApi.createDsDnaBetweenPoints,
            "Creates straight double-stranded DNA starting and ending at desired locations."
        ],
        [
            ScriptingApi.createPeptide,
            "Creates peptide with the given sequence."
        ],
        [
            ScriptingApi.addSphere,
            "Adds sphere object defined by position, color, and radius."
        ],
        [
            ScriptingApi.addSpheres,
            "Adds several sphere objects at the same time, all of them handled using a single data buffer."
        ],
        [
            ScriptingApi.addArrow,
            "Adds arrow object defined by start and end positions, color, and radius."
        ],
        [
            ScriptingApi.addLine,
            "Adds line object defined by start and end positions, color, and width."
        ],
        [
            ScriptingApi.addLabel,
            "Adds text label defined by position, color, size and textual content."
        ],
        [
            ScriptingApi.addBox,
            "Adds box with the defined position, orientation, size, and color."
        ],
        [
            ScriptingApi.runScript,
            "Executes loaded script with the given name and optional arguments (provide name in form of plugin_name::script_name)."
        ],
        [
            ScriptingApi.installScript,
            "Enables to install script from the provided URL."
        ],
        [
            ScriptingApi.installPlugin,
            "Enables to install plugin from the provided URL or official plugin repository."
        ],
        [
            ScriptingApi.setSharedVar,
            "Sets new value to the shared variable shared among scripts."
        ],
        [
            ScriptingApi.getSharedVar,
            "Returns contents of the shared variable shared among scripts."
        ],
        [
            ScriptingApi.getDeltaTime,
            "Returns delta time, i.e., the time since the last update call."
        ],
        [
            ScriptingApi.hasSharedVar,
            "Returns boolean determining whether the shared variable with the given name exists."
        ],
        [
            ScriptingApi.removeSharedVar,
            "Removes given shared variable."
        ],
        [
            ScriptingApi.markDisposable,
            "Marks component as disposable, i.e., makes it easy to remove it with a single scripting API call."
        ],
        [
            ScriptingApi.removeDisposables,
            "Removes all components marked as disposables."
        ],
        [
            ScriptingApi.isAllAtom,
            "Returns true if the given component or structure represents all-atom model."
        ],
        [
            ScriptingApi.isCoarseGrained,
            "Returns true if the given component or structure represents coarse-grained model."
        ],
        [
            ScriptingApi.convertAaComponentToCg,
            "Converts given all-atom component to a coarse-grained one."
        ],
        [
            ScriptingApi.convertCgComponentToAa,
            "Converts given coarse-grained component to an all-atom one."
        ],
        [
            ScriptingApi.setBackgroundColor,
            "Sets new background color (hexadecimal string) for this scene"
        ],
        [
            ScriptingApi.focusOnAll,
            "Focuses camera view on all objects in the scene"
        ],
        [
            ScriptingApi.downloadTxt,
            "Downloads given string as *.txt file with the provided name."
        ],
        [
            ScriptingApi.downloadPdb,
            "Downloads given structure (component) as *.pdb file with the provided name."
        ],
        [
            ScriptingApi.downloadUnf,
            "Downloads given components as *.unf file with the provided name."
        ],
        [
            ScriptingApi.downloadScreenshot,
            "Downloads screenshot from the current point of view."
        ],
        [
            ScriptingApi.getComponentCenter,
            "Returns centroid of the provided component."
        ],
        [
            ScriptingApi.getChainCount,
            "Returns the number of chains of the provided structure."
        ],
        [
            ScriptingApi.getResidueCount,
            "Returns the number of residues of the provided structure."
        ],
        [
            ScriptingApi.getAtomCount,
            "Returns the number of atoms of the provided structure"
        ],
        [
            ScriptingApi.eachChain,
            "Calls provided callback on each chain of the given structure."
        ],
        [
            ScriptingApi.getChainName,
            "Returns the name of the provided chain."
        ],
        [
            ScriptingApi.getChainLength,
            "Returns the length of the provided chain."
        ],
        [
            ScriptingApi.eachResidueOfChain,
            "Calls provided callback on each residue of the given chain."
        ],
        [
            ScriptingApi.eachResidue,
            "Calls provided callback on each residue of the given structure."
        ],
        [
            ScriptingApi.getResidueName,
            "Returns name of the provided residue."
        ],
        [
            ScriptingApi.getResiduePosition,
            "Returns position of the provided residue."
        ],
        [
            ScriptingApi.eachAtomOfResidue,
            "Calls provided callback on each atom of the given residue."
        ],
        [
            ScriptingApi.eachAtom,
            "Calls provided callback on each atom of the given structure."
        ],
        [
            ScriptingApi.getAtomName,
            "Returns name of the provided atom."
        ],
        [
            ScriptingApi.getElementName,
            "Returns name of the provided element."
        ],
        [
            ScriptingApi.getAtomPosition,
            "Returns position of the provided atom."
        ],
        [
            ScriptingApi.addComponentAnnotation,
            "Attaches annotation (label) to the given component."
        ],
        [
            ScriptingApi.removeComponentAnnotation,
            "Removes annotation attached to the component."
        ],
        [
            ScriptingApi.removeComponentAnnotations,
            "Removes all annotations attached to the component."
        ],
        [
            ScriptingApi.getResidueIndex,
            "Returns index of this residue in its corresponding store."
        ],
        [
            ScriptingApi.getAtomIndex,
            "Returns index of this atom in its corresponding store."
        ],
        [
            ScriptingApi.getChainAtIndex,
            "Returns reference to chain at given index in the structure."
        ],
        [
            ScriptingApi.isProteinChain,
            "Returns true if the given chain is a protein chain."
        ],
        [
            ScriptingApi.isNucleicChain,
            "Returns true if the given chain is a nucleic acid chain."
        ],
        [
            ScriptingApi.getResidueAtIndex,
            "Returns residue at the given index in the chain (ordered in N/5' to C/3' order)."
        ],
        [
            ScriptingApi.isProteinResidue,
            "Returns true if the given residue is an amino acid."
        ],
        [
            ScriptingApi.isNucleicResidue,
            "Returns true if the given residue is a nucleotide."
        ],
        [
            ScriptingApi.getLastClickedObject,
            "Returns the last object (proxy) that was left-mouse-clicked."
        ],
        [
            ScriptingApi.getLastHoveredObject,
            "Returns the last object (proxy) that was hovered-over with a mouse."
        ],
        [
            ScriptingApi.getLastClickedAtom,
            "If the last object that was left-mouse-clicked references an atom, it is returned by this function."
        ],
        [
            ScriptingApi.getLastHoveredAtom,
            "If the last object that was hovered with a mouse references an atom, it is returned by this function."
        ],
        [
            ScriptingApi.getLastClickedResidue,
            "If the last object that was left-mouse-clicked references a residue, it is returned by this function."
        ],
        [
            ScriptingApi.getLastHoveredResidue,
            "If the last object that was hovered with a mouse references a residue, it is returned by this function."
        ],
        [
            ScriptingApi.getLastClickedChain,
            "If the last object that was left-mouse-clicked references a chain, it is returned by this function."
        ],
        [
            ScriptingApi.getLastHoveredChain,
            "If the last object that was hovered with a mouse references a chain, residue or a chain, it is returned by this function."
        ],
        [
            ScriptingApi.getLastClickedStructure,
            "If the last object that was left-mouse-clicked references a structure, it is returned by this function."
        ],
        [
            ScriptingApi.getLastHoveredStructure,
            "If the last object that was hovered with a mouse references a structure, it is returned by this function."
        ],
        [
            ScriptingApi.showPrompt,
            "Shows a prompt enabling the user to provide a textual input to the script."
        ],
        [
            ScriptingApi.showAlert,
            "Shows an alert box displaying a message to the user."
        ],
        [
            ScriptingApi.showConfirm,
            "Shows a confirm box enabling to user to select OK (true) or Cancel (false)."
        ],
        [
            ScriptingApi.addVectors,
            "Returns a vector being equal to the sum of two provided vectors."
        ],
        [
            ScriptingApi.subtractVectors,
            "Returns a vector being equal to the subtraction of two provided vectors."
        ],
        [
            ScriptingApi.dotProduct,
            "Computes vector dot product."
        ],
        [
            ScriptingApi.crossProduct,
            "Computes vector cross product."
        ],
        [
            ScriptingApi.normalizeVector,
            "Normalizes given vector."
        ],
        [
            ScriptingApi.multiplyVectorByScalar,
            "Multiplies given vector by a scalar."
        ],
        [
            ScriptingApi.vectorLength,
            "Returns length of the provided vector."
        ],
        [
            ScriptingApi.multiplyMatrixVector,
            "Multiplies vector by the provided matrix, returning the result."
        ],
        [
            ScriptingApi.multiplyMatrixMatrix,
            "Multiplies two matrices, returning the result."
        ],
        [
            ScriptingApi.makeTranslationMatrix,
            "Creates translation matrix with the given properties."
        ],
        [
            ScriptingApi.makeRotationMatrix,
            "Creates rotation matrix with the given properties (in degrees)."
        ],
        [
            ScriptingApi.getMatrixInverse,
            "Returns inverse of the provided matrix."
        ],
        [
            ScriptingApi.getComponentMatrix,
            "Returns transformation matrix of the given component."
        ],
        [
            ScriptingApi.httpGetText,
            "Creates a GET request to load a text from external source."
        ],
        [
            ScriptingApi.httpGetObject,
            "Creates a GET request to load an object/json from external source."
        ],
        [
            ScriptingApi.httpPostObject,
            "Creates a POST request targeted at the given resource, with an object as a body."
        ],
        [
            ScriptingApi.httpPostText,
            "Creates a POST request targeted at the given resource, with a text as a body."
        ],
        [
            ScriptingApi.httpPostUrlQuery,
            "Creates a POST request targeted at the given resource, encoded as URL query."
        ],
        [
            ScriptingApi.addModalWindow,
            "Creates a new Modal window with the given content."
        ],
        [
            ScriptingApi.attachToUpdate,
            "Attaches given script to the update call."
        ],
        [
            ScriptingApi.detachFromUpdate,
            "Detaches given script from the update call."
        ]
    ];

    let scripting_api_funcs_list: [string, string, (...args: any) => any][] =
        scripting_api_funcs_desc
            .map(x => [functionNameToSnakeCase(x[0]), x[1], x[0]])
            .sort((lhs: any, rhs: any) => (lhs[0] as string).localeCompare(rhs[0] as string)) as any;

    return scripting_api_funcs_list;
}