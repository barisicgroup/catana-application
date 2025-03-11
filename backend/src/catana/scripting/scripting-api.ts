import { addComponentFromSequence, AtomGenerationLimit, AtomProxy, CatanaState, CgMonomerProxy, CgPolymer, CgStructure, CgStructureComponent, ChainProxy, Color, Component, convertAaStrucCompToCgStrucComp, convertCgStrucCompToAaStrucComp, download, duplicateComponentContainingStructure, Euler, Log, Matrix4, MultiObjectsStorage, PdbWriter, PickingProxy, RepresentationElement, ResidueProxy, Shape, Stage, Structure, StructureComponent, UnfWriter, Vector3 } from "../../catana";
import Annotation from "../../component/annotation";
import { degToRad, radToDeg } from "../../math/math-utils";
import BufferCreator from "../geometry/buffer-creator";
import { getFastaRecordForStructure } from "../utils/catana-sequence-utils";
import GlobalIdGenerator from "../utils/global-id-generator";
import { PluginUIElemTypeRecord } from "./plugin-ui";
import { getApiFunctionsList } from "./scripting-api-funcslist";

/**
 * NOTE:
 * - API functions return "null" instead of "undefined" since JSPython
 * does not work well with "undefined".
 * - If you add new function to ScriptingApi, add it also to {@link getApiFunctionsList} to make it accessible
 * in CLI and JSPython scripting.
 */

/**
 * TODO:
 * - Add functions for moving residues/atoms
 * - Add functions using "filter string" as an input (e.g., callback is called only where filter is true, ...)
 * - Add functions for DNA connection, setting sequence, mutations, ...?
 * - Add functions for removing structural parts
 * - Add functions supporting creation of structures from scratch (e.g., "spawn" atoms of the given residue type)?
 */

/**
 * Facade class exporting some of Catana's functionality in a more abstract/unified way
 * in order to provide more convenient interface, e.g., for scripting functionality.   
 * In many cases, this class abstracts from the underlying all-atom and coarse-grained models
 * and enables to return both types of data with the same function call.
 */
export default abstract class ScriptingApi {
    private static _stage: Stage;
    private static _lastPickProxyLftClick: PickingProxy | undefined;
    private static _lastPickProxyHover: PickingProxy | undefined;

    /**
     * Initializes the class data
     * 
     * @param stage stage instance
     */
    public static init(stage: Stage) {
        ScriptingApi._stage = stage;

        stage.catanaActions.signals.click_left.add(pickingProxy => {
            ScriptingApi._lastPickProxyLftClick = pickingProxy;
        });

        stage.catanaActions.signals.hover.add(pickingProxy => {
            ScriptingApi._lastPickProxyHover = pickingProxy;
        });
    }

    /**
     * Returns an array of three-element tuples:
     * - function name for JSPython (e.g., "add")
     * - function description (e.g., "Returns sum of two provided numbers") 
     * - reference to function itself
     */
    public static getFunctionsList(): [string, string, (...args: any) => any][] {
        return getApiFunctionsList();
    }

    /**
     * Logs a text message that will be captured by Catana.
     * 
     * @param message contents of the message
     */
    public static log(message: any): void {
        Log.log(message);
    }

    /**
     * Sets new background color for this scene.
     * 
     * @param hexColor hexadecimal string encoding the color 
     */
    public static setBackgroundColor(hexColor: string): void {
        ScriptingApi._stage.setParameters({
            backgroundColor: hexColor
        });
    }

    /**
     * Returns the maximum number of atoms that can be generated.
     * 
     * @returns the maximum number of atoms that can be generated
     */
    public static getAtomGenLimit(): number {
        return AtomGenerationLimit.getMaximum();
    }

    /**
     * Sets new upper bound for the number of atoms that can be generated.
     * 
     * @param max new maximum for the atom generation
     */
    public static setAtomGenLimit(max: number): void {
        AtomGenerationLimit.setNewMaximum(max);
    }

    /**
     * Downloads given string as *.txt file with the provided name.
     * 
     * @param name name of the file to download (without extension)
     * @param content contents of the text file
     */
    public static downloadTxt(name: string, content: string): void {
        download(new Blob([content], {
            type: "text/plain"
        }), name + ".txt");
    }

    /**
     * Downloads given structure (component) as *.pdb file with the provided name.
     * 
     * @param name name of the file to download (without extension)
     * @param strucComp all-atom structure component referencing the structure to download
     */
    public static downloadPdb(name: string, strucComp: StructureComponent): void {
        const pdbWriter = new PdbWriter(strucComp.structure);
        pdbWriter.download(name);
    }

    /**
     * Downloads given components as *.unf file with the provided name.
     * 
     * @param name name of the file to download (without extension)
     * @param strucComps an array of structure components referencing structures to download
     */
    public static downloadUnf(name: string,
        strucComps: (CgStructureComponent | StructureComponent)[]): void {
        const unfWriter = new UnfWriter(strucComps);
        unfWriter.download(name);
    }

    /**
     * Downloads screenshot from the current point of view.
     * 
     * @param name name of the file to download (without extension)
     * @param transparent boolean determining if the screenshot should be transparent or not
     */
    public static downloadScreenshot(name: string, transparent: boolean): void {
        ScriptingApi._stage.makeImage({
            antialias: true,
            transparent: transparent
        }).then(blob => {
            download(blob, name);
        })
    }

    /**
     * Loads structure with the given PDB ID from the RCSB databank.
     * 
     * @example
     * ScriptingApi.fetchRcsb("1BNA")
     * 
     * @param pdbId PDB ID of the structure to load
     * @returns promise resolving to loaded structure component
     */
    public static fetchRcsb(pdbId: string): Promise<Component | Component[]> {
        const cifId = pdbId.split(".")[0] + ".cif";
        return ScriptingApi.fetchStructureCommon("rcsb://" + cifId);
    }

    /**
     * Loads structure, identified by CID, from PubChem.
     * 
     * @param cid CID of the structure to download
     * @returns promise resolving to loaded structure component
     */
    public static fetchPubchem(cid: string): Promise<Component | Component[]> {
        return ScriptingApi.fetchStructureCommon("pubchem://" + cid);
    }

    /**
     * Fetches structure from the provided URL.
     * 
     * @param url url where the structure can be found
     * @returns promise resolving to loaded structure component
     */
    public static fetchUrl(url: string): Promise<Component | Component[]> {
        let finUrl = url;
        if (!url.includes("http")) {
            finUrl = "https://" + url;
        }
        return ScriptingApi.fetchStructureCommon(finUrl);
    }

    /**
     * Returns an array with all currently loaded components.
     * 
     * @returns array of all currently loaded components
     */
    public static getComponents(): Component[] {
        return [...ScriptingApi._stage.compList];
    }

    /**
     * Returns an array with all structure-referencing loaded components.
     * 
     * @returns array of all currently loaded components representing structural data
     */
    public static getStructuralComponents(): (StructureComponent | CgStructureComponent)[] {
        const res: (StructureComponent | CgStructureComponent)[] = [];
        const cl = ScriptingApi._stage.compList;

        for (let i = 0; i < cl.length; ++i) {
            const c = cl[i];
            if (c instanceof StructureComponent || c instanceof CgStructureComponent) {
                res.push(c);
            }
        }

        return res;
    }

    /**
     * Returns the UUID (Universally unique identifier) of the given component.
     * 
     * @param c target component
     * @returns UUID string
     */
    public static getComponentUuid(c: Component): string {
        return c.uuid;
    }

    /**
     * Finds component with the given UUID.
     * 
     * @param uuid UUID of the component to search for
     * @returns reference to found component or null if not found
     */
    public static findComponentWithUuid(uuid: string): Component | null {
        return ScriptingApi._stage.compList.find(x => x.uuid === uuid) ?? null;
    }

    /**
     * Finds component with the given name.
     * If more components with the same name exist, the first found is returned.
     * 
     * @param name name of the component to search for
     * @returns reference to found component or null if not found
     */
    public static findComponentWithName(name: string): Component | null {
        return ScriptingApi._stage.compList.find(x => x.name === name) ?? null;
    }

    /**
     * Sets new name for the given component.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @param name new name string
     * @returns reference to modified component
     */
    public static setComponentName(comp: string | Component, name: string): Component | null {
        const c = ScriptingApi.getComponentReference(comp);
        c?.setName(name);
        return c;
    }

    /**
     * Returns name of the given component.
     * 
     * @param comp target component's UUID, name, or object reference
     * @returns name of the provided component
     */
    public static getComponentName(comp: string | Component): string {
        const c = ScriptingApi.getComponentReference(comp);
        return c?.name ?? "";
    }

    /**
     * Returns position of the component's centroid.
     * 
     * @param comp target component's UUID, name, or object reference
     * @returns vector (three-element array) corresponding to component's centroid position, or empty array if component is not found
     */
    public static getComponentCenter(comp: string | Component): number[] {
        const c = ScriptingApi.getComponentReference(comp);
        return c?.getCenter().toArray() ?? [];
    }

    /**
     * Attaches annotation label to the given component
     * 
     * @param comp target component's UUID, name, or object reference
     * @param pos position of the label (in component's coordinate space)
     * @param content textual contents of the label
     * @returns reference to newly added annotation object, or null if none added
     */
    public static addComponentAnnotation(comp: string | Component, pos: number[],
        content: string): Annotation | null {
        const c = ScriptingApi.getComponentReference(comp);

        if (c) {
            const transfIv = new Matrix4().getInverse(c.matrix);
            return c.addAnnotation(
                new Vector3().fromArray(pos).applyMatrix4(transfIv),
                content,
                {});
        }

        return null;
    }

    /**
     * Removes given annotation attached to the component
     * 
     * @param comp target component's UUID, name, or object reference
     * @param annot annotation to remove
     */
    public static removeComponentAnnotation(comp: string | Component, annot: Annotation): void {
        const c = ScriptingApi.getComponentReference(comp);

        if (c) {
            c.removeAnnotation(annot);
        }
    }

    /**
     * Removes all annotations attached to a component.
     * 
     * @param comp target component's UUID, name, or object reference 
     */
    public static removeComponentAnnotations(comp: string | Component): void {
        const c = ScriptingApi.getComponentReference(comp);

        if (c) {
            c.removeAllAnnotations();
        }
    }

    /**
     * Centers view onto the provided component.
     * 
     * @param comp target component's UUID, name, or object reference 
     */
    public static focusOnComponent(comp: string | Component): void {
        const c = ScriptingApi.getComponentReference(comp);
        c?.autoView();
    }

    /**
     * Updates camera view to focus on all loaded components (objects in the scene).
     */
    public static focusOnAll(): void {
        ScriptingApi._stage.autoView(500);
    }

    /**
     * Sets the visibility of the provided component or representation.
     * 
     * @param obj object to set visibility for
     * @param isVisible true if the object should be visible now, false otherwise
     */
    public static setVisibility(obj: Component | RepresentationElement, isVisible: boolean): void {
        obj?.setVisibility(isVisible);
    }

    /**
     * Duplicates provided component.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @returns reference to duplicated version of the provided component.
     */
    public static copyComponent(comp: string | Component): Component | null {
        const c = ScriptingApi.getComponentReference(comp);
        if (c && (c instanceof StructureComponent || c instanceof CgStructureComponent)) {
            return duplicateComponentContainingStructure(ScriptingApi._stage, c);
        }
        return null;
    }

    /**
     * Removes given component from the stage and clears its data.
     * 
     * @param comp target component's UUID, name, or object reference 
     */
    public static removeComponent(comp: string | Component): void {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            ScriptingApi._stage.removeComponent(c);
        }
    }

    /**
     * Removes all components from the stage.
     */
    public static removeAllComponents(): void {
        ScriptingApi._stage.removeAllComponents();
    }

    /**
     * Returns position of the component's origin.
     * 
     * @param comp target component's UUID, name, or object reference
     * @param targetArray if provided, the position will be stored into this array
     * @returns reference to {@link targetArray} filled with the position data or a reference to new vector/array with positional data
     */
    public static getComponentPosition(comp: string | Component, targetArray?: number[]): number[] {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            const arr = targetArray ?? new Array<number>(3);
            return c.position.toArray(arr);
        }
        return [];
    }

    /**
     * Returns matrix describing the component's transformations.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @returns array storing the matrix storing the component's transformation data.
     */
    public static getComponentMatrix(comp: string | Component): number[] {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            return ScriptingApi.mat4ToArr(c.matrix);
        }
        return [];
    }

    /**
     * Translates provided component by the given amount of Angstroms.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @param transl amount of translation (along x, y, and z axes)
     * @returns reference to translated component
     */
    public static translateComponent(comp: string | Component, transl: number[]): Component | null {
        const c = ScriptingApi.getComponentReference(comp);

        if (transl.length < 3) {
            Log.error("Insufficient array length: ", transl.length);
        }

        c?.setPosition([
            c.position.x + transl[0],
            c.position.y + transl[1],
            c.position.z + transl[2]]
        );

        return c;
    }

    /**
     * Sets new position for the component's origin.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @param pos new position of the component's origin
     * @returns reference to modified component
     */
    public static setComponentPosition(comp: string | Component, pos: number[]): Component | null {
        const c = ScriptingApi.getComponentReference(comp);
        if (pos.length < 3) {
            Log.error("Insufficient array length: ", pos.length);
        }
        c?.setPosition(new Vector3().fromArray(pos));
        return c;
    }

    /**
     * Returns rotation of the provided component.
     * 
     * @param comp target component's UUID, name, or object reference
     * @param targetArray if provided, the rotation will be stored into this array
     * @returns reference to {@link targetArray} filled with the rotation data or a reference to new vector/array with rotation data
     */
    public static getComponentRotation(comp: string | Component, targetArray?: number[]): number[] {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            const arr = new Euler()
                .setFromQuaternion(c.quaternion)
                .toArray(targetArray ?? new Array<number>(3));

            return [
                radToDeg(arr[0]),
                radToDeg(arr[1]),
                radToDeg(arr[2]),
            ];
        }
        return [];
    }

    /**
     * Rotates component around X, Y, and Z axes by the given amount in degrees.
     * 
     * @param comp target component's UUID, name, or object reference
     * @param rotDeg rotation (three-element array in degrees)
     * @returns reference to rotated component
     */
    public static rotateComponent(comp: string | Component, rotDeg: number[]): Component | null {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            const rot = new Euler().setFromQuaternion(c.quaternion);

            if (rotDeg.length < 3) {
                Log.error("Insufficient array length: ", rotDeg.length);
            }

            c.setRotation([
                rot.x + degToRad(rotDeg[0]),
                rot.y + degToRad(rotDeg[1]),
                rot.z + degToRad(rotDeg[2])
            ]);
        }
        return c;
    }

    /**
     * Sets new rotation for the provided component.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @param rot new component's rotation (three-element array in degrees)
     * @returns reference to the rotated component
     */
    public static setComponentRotation(comp: string | Component, rot: number[]): Component | null {
        const c = ScriptingApi.getComponentReference(comp);

        if (rot.length < 3) {
            Log.error("Insufficient array length: ", rot.length);
        }

        c?.setRotation([
            degToRad(rot[0]),
            degToRad(rot[1]),
            degToRad(rot[2])
        ]);

        return c;
    }

    /**
     * Returns structural data represented by this component.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @returns reference to underlying structure wrapped by this component.
     */
    public static getStructureFromComponent(comp: string | Component): Structure | CgStructure | null {
        const c = ScriptingApi.getComponentReference(comp);

        if (c instanceof StructureComponent) {
            return c.structure;
        } else if (c instanceof CgStructureComponent) {
            return c.cgStructure;
        }

        return null;
    }

    /**
     * Returns the number of chains of the provided structure.
     * In case of all-atom structures, this number may also include 
     * non-polymer chains (e.g., water chains or "chains" formed by small molecules).
     * 
     * @param structure reference to structure
     * @returns number of chains
     */
    public static getChainCount(structure: Structure | CgStructure): number {
        if (structure instanceof Structure) {
            return structure.chainStore.count;
        }
        return structure.polymerCount;
    }

    /**
     * Returns the number of residues of the provided structure.
     * In case of all-atom structures, this number may also include small-molecule residues.
     * 
     * @param structure reference to structure
     * @returns number of residues
     */
    public static getResidueCount(structure: Structure | CgStructure): number {
        if (structure instanceof Structure) {
            return structure.residueStore.count;
        }
        return structure.monomerCount;
    }

    /**
     * Returns the number of atoms of the provided structure.
     * 
     * @param structure reference to structure
     * @returns number of atoms
     */
    public static getAtomCount(structure: Structure): number {
        return structure.atomCount ?? 0;
    }

    /**
     * Executes provided callback on each chain of the given structure.
     * 
     * @param structure reference to structure
     * @param callback callback to be executed on each chain
     */
    public static eachChain(structure: Structure | CgStructure,
        callback: (chain: ChainProxy | CgPolymer) => void): void {
        if (structure instanceof Structure) {
            structure.eachChain(callback);
        } else {
            structure.forEachPolymer(callback);
        }
    }

    /**
     * Returns reference to chain stored at given index in the structure.
     * 
     * @param structure reference to structure
     * @param index index of the desired chain
     * @returns chain of {@link structure} stored at {@link index}
     */
    public static getChainAtIndex(structure: Structure | CgStructure, index: number): ChainProxy | CgPolymer {
        if (structure instanceof Structure) {
            return structure.getChainProxy(index);
        }
        return structure.polymers.get(index)!;
    }

    /**
     * Returns the name of the provided chain.
     * 
     * @param chain reference to chain
     * @returns string storing the chain name
     */
    public static getChainName(chain: ChainProxy | CgPolymer): string {
        if (chain instanceof ChainProxy) {
            return chain.chainname;
        }
        return chain.name;
    }

    /**
     * Returns the length of the provided chain.
     * 
     * @param chain reference to chain
     * @returns length (number of residues) of the chain
     */
    public static getChainLength(chain: ChainProxy | CgPolymer): number {
        if (chain instanceof ChainProxy) {
            return chain.residueCount;
        }
        return chain.length;
    }

    /**
     * Returns boolean informing whether the chain is a protein chain or not.
     * 
     * @param chain reference to chain
     * @returns true if the chain is a protein chain, false otherwise
     */
    public static isProteinChain(chain: ChainProxy | CgPolymer): boolean {
        if (chain instanceof ChainProxy) {
            return chain.structure.getResidueProxy(chain.residueOffset).isProtein();
        }
        return chain.isProtein();
    }

    /**
     * Returns boolean informing whether the chain is a nucleic chain or not.
     * 
     * @param chain reference to chain
     * @returns true if the chain is a nucleic acid chain, false otherwise.
     */
    public static isNucleicChain(chain: ChainProxy | CgPolymer): boolean {
        if (chain instanceof ChainProxy) {
            return chain.structure.getResidueProxy(chain.residueOffset).isNucleic();
        }
        return chain.isNucleic();
    }

    /**
     * Executes provided callback on each residue of the given chain.
     * 
     * @param chain reference to chain
     * @param callback callback to be executed on each residue
     */
    public static eachResidueOfChain(chain: ChainProxy | CgPolymer,
        callback: (residue: ResidueProxy | CgMonomerProxy) => void): void {
        if (chain instanceof ChainProxy) {
            chain.eachResidue(callback);
        } else {
            chain.forEachMonomer(callback);
        }
    }

    /**
     * Executes provided callback on each residue of the given structure.
     * 
     * @param structure reference to structure.
     * @param callback callback to be executed on each residue.
     */
    public static eachResidue(structure: Structure | CgStructure,
        callback: (residue: ResidueProxy | CgMonomerProxy) => void): void {
        if (structure instanceof Structure) {
            structure.eachResidue(callback);
        } else {
            structure.forEachMonomer(callback);
        }
    }

    /**
     * Returns residue stored at the given index in the chain.
     * Residues are ordered in 5'/N-term to 3'/C-term manner, i.e.,
     * index 0, for example, corresponds to the 5' nucleic acid, resp. N-terminus amino acid.
     * 
     * @param chain parent chain of the residue
     * @param index index of the residue
     * @returns reference to the residue object
     */
    public static getResidueAtIndex(chain: ChainProxy | CgPolymer, index: number):
        ResidueProxy | CgMonomerProxy {
        if (chain instanceof ChainProxy) {
            return chain.structure.getResidueProxy(chain.residueOffset + index);
        }
        const proxy = chain.getMonomerProxyTemplate();
        proxy.index = index;
        return proxy;
    }

    /**
     * Returns name of the residue
     * 
     * @param residue reference to residue
     * @returns string storing the residue name
     */
    public static getResidueName(residue: ResidueProxy | CgMonomerProxy): string {
        if (residue instanceof ResidueProxy) {
            return residue.resname;
        } else {
            return residue.residueName;
        }
    }

    /**
     * Returns index of the given residue (corresponding to its position in the parent chain).
     * 
     * @param residue residue reference
     * @returns index of the residue in the parent chain
     */
    public static getResidueIndex(residue: ResidueProxy | CgMonomerProxy): number {
        return residue.index;
    }

    /**
     * Returns vector corresponding to the position of the residue.
     * For all-atom model structures, this position equals to the centroid of all residue atoms.
     * For coarse-grained model structures, this position equals to the position of the residue's backbone.
     * 
     * @param residue reference to residue
     * @returns vector (three-element array) storing the position
     */
    public static getResiduePosition(residue: ResidueProxy | CgMonomerProxy): number[] {
        if (residue instanceof ResidueProxy) {
            return residue.getAtomCentroid().toArray();
        } else {

            return residue.position.toArray();
        }
    }

    /**
     * Returns boolean informing whether the given residue is a protein residue or not.
     * 
     * @param residue reference to residue
     * @returns true if the given residue comes from protein, false otherwise
     */
    public static isProteinResidue(residue: ResidueProxy | CgMonomerProxy): boolean {
        if (residue instanceof ResidueProxy) {
            return residue.isProtein();
        } else {
            return residue.getParentPolymer().isProtein();
        }
    }

    /**
     * Returns boolean informing whether the given residue is a nucleic residue or not.
     * 
     * @param residue reference to residue
     * @returns true if the given residue comes from nucleic acid, false otherwise
     */
    public static isNucleicResidue(residue: ResidueProxy | CgMonomerProxy): boolean {
        if (residue instanceof ResidueProxy) {
            return residue.isNucleic();
        } else {
            return residue.getParentPolymer().isNucleic();
        }
    }

    /**
     * Executes provided callback on each atom of the given residue.
     * 
     * @param residue residue reference
     * @param callback callback to be executed on each atom of this residue
     */
    public static eachAtomOfResidue(residue: ResidueProxy,
        callback: (atom: AtomProxy) => void): void {
        residue.eachAtom(callback);
    }

    /**
     * Executes provided callback on each atom of the given structure.
     * 
     * @param structure reference to structure
     * @param callback callback to be executed on each atom from this structure
     */
    public static eachAtom(structure: Structure,
        callback: (atom: AtomProxy) => void): void {
        structure.eachAtom(callback);
    }

    /**
     * Returns name (PDB convention) of the provided atom.
     * 
     * @param atom reference to atom
     * @returns string corresponding to the atom's name
     */
    public static getAtomName(atom: AtomProxy): string {
        return atom.atomname;
    }

    /**
     * Returns identification of atom's chemical element.
     * 
     * @param atom reference to atom
     * @returns string storing the atom's element identification
     */
    public static getElementName(atom: AtomProxy): string {
        return atom.element;
    }

    /**
     * Returns index of an atom corresponding to its position in the atom store.
     * 
     * @param atom reference to atom
     * @returns index of the atom
     */
    public static getAtomIndex(atom: AtomProxy): number {
        return atom.index;
    }

    /**
     * Returns position of the atom in space.
     * 
     * @param atom reference to atom
     * @returns vector (three-element array) corresponding to the atom's position.
     */
    public static getAtomPosition(atom: AtomProxy): number[] {
        const pos = [0, 0, 0];
        atom.positionToArray(pos);
        return pos;
    }

    /**
     * Returns FASTA-formatted sequence of this component's structure.
     * 
     * @example
     * const seq = ScriptingApi.getComponentSequence("1bna.cif")
     * console.log(seq);
     * // Console output:
     * // >1bna.cif|Chain A|Len 12
     * // CGCGAATTCGCG
     * // >1bna.cif|Chain B|Len 12
     * // CGCGAATTCGCG
     * 
     * @param comp target component's UUID, name, or object reference
     * @returns structure sequence FASTA string
     */
    public static getComponentSequence(comp: string | Component): string {
        const c = ScriptingApi.getComponentReference(comp);
        return (c instanceof StructureComponent || c instanceof CgStructureComponent) ?
            getFastaRecordForStructure(c) : "";
    }

    /**
     * Removes all visual representations from the component.
     * 
     * @param comp target component's UUID, name, or object reference 
     */
    public static removeComponentRepresentations(comp: string | Component): void {
        const c = ScriptingApi.getComponentReference(comp);
        c?.removeAllRepresentations();
    }

    /**
     * Adds given type of representation to the component
     * 
     * @example
     * ScriptingApi.addRepresentationToComponent("1bna.cif", "ball+stick")
     * 
     * @param comp target component's UUID, name, or object reference
     * @param reprName name of the representation
     * @returns reference to the representation element/object
     */
    public static addRepresentationToComponent(comp: string | Component, reprName: string): any {
        const c = ScriptingApi.getComponentReference(comp);

        if (c) {
            return c.addRepresentation(reprName, {});
        }

        return null;
    }

    /**
     * Sets new filter string for the selected component's representation
     * 
     * @example
     * ScriptingApi.setRepresentationFilter("1bna.cif", "cartoon", "5-10 or :B")
     * 
     * @param comp target component's UUID, name, or object reference
     * @param repr name (or reference to) of the representation to modify
     * @param filter new filter string
     */
    public static setRepresentationFilter(comp: string | Component, repr: string | RepresentationElement, filter: string): void {
        ScriptingApi.setRepresentationCommon(comp, repr, (r: RepresentationElement) => {
            r.setFilter(filter);
        });
    }

    /**
     * Sets new color scheme for the selected component's representation
     * 
     * @example
     * ScriptingApi.setRepresentationColor("1bna.cif", "cartoon", "resname")
     * 
     * @param comp target component's UUID, name, or object reference
     * @param repr name (or reference to) of the representation to modify
     * @param color new color, resp. color scheme, to use
     */
    public static setRepresentationColor(comp: string | Component, repr: string | RepresentationElement, color: number | string | Color): void {
        ScriptingApi.setRepresentationCommon(comp, repr, (r: RepresentationElement) => {
            r.setColor(color);
        });
    }

    /**
     * Creates coarse-grained single-stranded DNA object having the desired sequence.
     * 
     * @param seq sequence of the newly created DNA strand
     * @returns reference to newly created component, or null in case of an error
     */
    public static createSsDna(seq: string): Component | null {
        return ScriptingApi.createDnaPep(seq, {
            compType: "dna",
            dnaDoubleStranded: false
        });
    }

    /**
     * Creates coarse-grained double-stranded DNA object having the desired sequence.
     * 
     * @param seq sequence of the DNA strands.
     * @returns reference to newly created component, or null in case of an error
     */
    public static createDsDna(seq: string): Component | null {
        return ScriptingApi.createDnaPep(seq, {
            compType: "dna",
            dnaDoubleStranded: true
        });
    }

    /**
     * Creates coarse-grained straight double-helical DNA segment starting at point {@link start} and ending at point {@link end}.
     * The sequence of DNA is defined by currently used sequence provider.
     * 
     * @param start vector (three-element array) defining the start of the double helix
     * @param end vector (three-element array) defining the end of the double helix
     * @param parentComp if provided, defines component to which the DNA should be appended
     * @returns reference to the component (either {@link parentComp} or a newly created one) containing the created DNA
     */
    public static createDsDnaBetweenPoints(start: number[], end: number[],
        parentComp?: CgStructureComponent): CgStructureComponent | null {
        const structure = parentComp?.cgStructure ?? new CgStructure(GlobalIdGenerator.generateId());
        let comp = parentComp;

        CatanaState.dnaFactory.buildDsDnaBetweenPoints(
            new Vector3().fromArray(start),
            new Vector3().fromArray(end),
            structure
        );

        if (!comp) {
            let c = ScriptingApi._stage.addComponentFromObject(new MultiObjectsStorage([structure]));
            comp = c[0] as CgStructureComponent;
            ScriptingApi._stage.defaultFileRepresentation(comp);
        }

        return comp;
    }

    /**
     * Creates coarse-grained peptide with the given sequence.
     * The structure of the peptide is only a crude approximation.
     * 
     * @param seq peptide sequence
     * @returns refeence to the component encapsulating the peptide
     */
    public static createPeptide(seq: string): Component | null {
        return ScriptingApi.createDnaPep(seq, {
            compType: "protein"
        });
    }

    /**
     * Adds colored sphere object to the scene.
     * For addition of multiple spheres, it is recommended to prefer the {@link addSpheres} function.
     * 
     * @param center center of the sphere
     * @param color hexadecimal string defining the sphere's color
     * @param radius radius of the sphere
     * @returns reference to component with the sphere
     */
    public static addSphere(center: number[], color: string, radius: number): Component | null {
        const shape = new Shape();
        shape.addSphere(new Vector3().fromArray(center), new Color(color), radius, "sphere");
        return ScriptingApi.addShape(shape);
    }

    /**
     * Adds one or more colored spheres to the scene.
     * Spheres are represented using a single component and data buffer,
     * thus this method is significantly better, performance-wise, than making
     * multiple {@link addSphere} calls.
     * 
     * @example
     * // Adds two spheres with centers at [0, 0, 0] and [10, 5, 15] coordinates.
     * // The first sphere is red and has a radius of 5 Ang., 
     * // the second one is green with 10 Ang. radius. 
     * // Both are semi-transparent.
     * ScriptingApi.addSpheres([0, 0, 0, 10, 5, 15], ["#FF0000","#00FF00"], [5, 10], 0.75)
     * 
     * @param centers array of centers of the spheres
     * @param colors array of hexadecimal colors of the spheres
     * @param radii array of radii of the spheres
     * @param opacity opacity of the spheres (<1.0 makes spheres semi-transparent)
     * @returns component storing the newly added spheres
     */
    public static addSpheres(centers: number[], colors: string[], radii: number[], opacity: number): Component | null {
        const shape = new Shape();

        const colArr = new Float32Array(colors.length * 3);
        const col = new Color();
        for (let i = 0; i < colors.length; ++i) {
            col.set(colors[i]);
            col.toArray(colArr, i * 3);
        }

        shape.addBuffer(BufferCreator.createSphereBufferFromArrays(
            new Float32Array(centers),
            colArr,
            new Float32Array(radii),
            undefined,
            false,
            false
        ));

        // The opacity must be passed here, not to buffer above
        return ScriptingApi.addShape(shape, { opacity });
    }

    /**
     * Adds colored arrow object pointing to particular location in the scene.
     * 
     * @param start start of the arrow (tail)
     * @param end end of the arrow (head)
     * @param color hexadecimal color of the arrow
     * @param radius radius/width of the arrow
     * @returns reference to component storing the arrow
     */
    public static addArrow(start: number[], end: number[], color: string,
        radius: number): Component | null {
        const shape = new Shape();
        shape.addArrow(
            new Vector3().fromArray(start),
            new Vector3().fromArray(end),
            new Color(color),
            radius,
            "arrow"
        );
        return ScriptingApi.addShape(shape);
    }

    /**
     * Adds line object spanning two provided points. 
     * 
     * @param start start of the line
     * @param end end of the line
     * @param color color of the line
     * @param radius width of the line
     * @returns reference to component storing the line
     */
    public static addLine(start: number[], end: number[], color: string,
        radius: number): Component | null {
        const shape = new Shape();
        shape.addWideline(
            new Vector3().fromArray(start),
            new Vector3().fromArray(end),
            new Color(color),
            radius,
            "line"
        );
        return ScriptingApi.addShape(shape);
    }

    /**
     * Places textual label to the given location.
     * 
     * @param pos position of the label
     * @param color hexadecimal text color
     * @param size text size
     * @param text contents of the label
     * @returns reference to component storing the label
     */
    public static addLabel(pos: number[], color: string,
        size: number, text: string): Component | null {
        const shape = new Shape();
        shape.addText(new Vector3().fromArray(pos), new Color(color),
            size, text);
        return ScriptingApi.addShape(shape);
    }

    /**
     * Adds colored box to the particular location in the scene.
     * 
     * @param center center of the box
     * @param color hexadecimal color of the box
     * @param heightAxis height axis of the box
     * @param depthAxis depth axis of the box
     * @param size size of the box
     * @returns reference to component storing the box
     */
    public static addBox(center: number[], color: string,
        heightAxis: number[], depthAxis: number[],
        size: number): Component | null {
        const shape = new Shape();
        shape.addBox(
            new Vector3().fromArray(center),
            new Color(color),
            size,
            new Vector3().fromArray(heightAxis),
            new Vector3().fromArray(depthAxis),
            "box"
        );
        return ScriptingApi.addShape(shape);
    }

    /**
     * Executes code of script with the given name.
     * 
     * @param name full name (including scope if needed) of the script to execute
     */
    public static runScript(name: string, ...args: any[]): void {
        ScriptingApi._stage.pluginManager.runScriptWithFullName(name, ...args);
    }

    /**
     * Installs (i.e., loads into Catana) script stored at the provided URL.
     * 
     * @param path URL referencing the script file
     */
    public static installScript(path: string): void {
        ScriptingApi._stage.pluginManager.addScriptFromFile(path).catch(Log.error);
    }

    /**
     * Installs (i.e., loads into Catana) plugin stored at the provided URL,
     * or stored at official Catana plugin repository with the provided name.
     * 
     * @param path URL or name referencing the plugin file
     */
    public static installPlugin(path: string): void {
        ScriptingApi._stage.pluginManager.addPluginFromFile(path).catch(Log.error);
    }

    /**
     * Sets new value to the shared variable (or creates this variable if it does not exist yet).
     * 
     * @param name name of the variable to set
     * @param value variable value
     */
    public static setSharedVar(name: string, value: any): void {
        ScriptingApi._stage.pluginManager.setSharedVariable(name, value);
    }

    /**
     * Returns value of the shared variable.
     * 
     * @param name variable name
     * @returns value stored by the variable
     */
    public static getSharedVar(name: string): any {
        return ScriptingApi._stage.pluginManager.getSharedVariable(name);
    }

    /**
     * Returns delta time value, i.e., time in seconds elapsed since the last execution
     * of plugins attached to the Catana's update call.
     * 
     * @returns delta time in seconds
     */
    public static getDeltaTime(): number {
        return ScriptingApi._stage.pluginManager.getDeltaTime();
    }

    /**
     * Checks if given shared variable exists.
     * 
     * @param name name of the shared variable to look for
     * @returns true if the variable exists, false otherwise.
     */
    public static hasSharedVar(name: string): boolean {
        return ScriptingApi._stage.pluginManager.hasSharedVariable(name);
    }

    /**
     * Removes given shared variable, i.e., it will not exist anymore.
     * 
     * @param name name of the variable to remove
     * @returns true if the variable was removed successfully, false otherwise
     */
    public static removeSharedVar(name: string): boolean {
        return ScriptingApi._stage.pluginManager.removeSharedVariable(name);
    }

    /**
     * Marks the component as disposable.
     * The motivation to do this is to internally label selected components 
     * as disposable ones, i.e., only temporary, to be able to remove all of them
     * at once making a single {@link removeDisposables} call. 
     * 
     * @param comp target component's UUID, name, or object reference
     */
    public static markDisposable(comp: string | Component): void {
        const c = ScriptingApi.getComponentReference(comp);
        if (c) {
            ScriptingApi._stage.pluginManager.addDisposableComponent(c);
        }
    }

    /**
     * Removes all disposable components (i.e, those marked as disposable using {@link markDisposable} call).
     */
    public static removeDisposables(): void {
        ScriptingApi._stage.pluginManager.removeDisposableComponents();
    }

    /**
     * Returns true if the given component or structure represents all-atom data.
     * 
     * @param obj structure or component to check for
     * @returns true if the provided object represents all-atom data
     */
    public static isAllAtom(obj: any): boolean {
        return obj instanceof Structure || obj instanceof StructureComponent;
    }

    /**
     * Returns true if the given component or structure represents coarse-grained data.
     * 
     * @param obj structure or component to check for
     * @returns true if the provided object represents coarse-grained data
     */
    public static isCoarseGrained(obj: any): boolean {
        return obj instanceof CgStructure || obj instanceof CgStructureComponent;
    }

    /**
     * Converts given coarse-grained component to an all-atom one.
     * The conversion includes generation of atomistic data.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @returns promise resolving with newly created component
     */
    public static convertCgComponentToAa(comp: CgStructureComponent): Promise<StructureComponent> {
        return convertCgStrucCompToAaStrucComp(
            ScriptingApi._stage,
            comp
        );
    }

    /**
     * Converts given all-atom component to a coarse-grained one.
     * The conversion reduces the atomistic level of detail based on the requirements
     * of coarse-grained data model used by Catana.
     * 
     * @param comp target component's UUID, name, or object reference 
     * @returns promise resolving with newly created component
     */
    public static convertAaComponentToCg(comp: StructureComponent): Promise<CgStructureComponent> {
        return convertAaStrucCompToCgStrucComp(
            ScriptingApi._stage,
            comp
        );
    }

    /**
     * Returns reference to the last object (instance of {@link PickingProxy}) that was 
     * clicked with the left mouse button.
     * If some of Catana's integrated modelling tools are active (e.g., amino acid mutation), 
     * the newly left-clicked objects are not reported during this period and old value remains.
     * 
     * @returns reference to the last clicked object
     */
    public static getLastClickedObject(): PickingProxy | null {
        return ScriptingApi._lastPickProxyLftClick ?? null;
    }

    /**
     * Returns reference to the last object (instance of {@link PickingProxy}) that was 
     * hovered-over with a mouse (i.e., the cursor was pointing to the given object).
     * If some of Catana's integrated modelling tools are active (e.g., amino acid mutation), 
     * the newly hovered-over objects are not reported during this period and old value remains.
     * 
     * @returns reference to the last hovered-over object
     */
    public static getLastHoveredObject(): PickingProxy | null {
        return ScriptingApi._lastPickProxyHover ?? null;
    }

    /**
     * Returns last atom that was left-clicked with a mouse.
     * Constraints of the {@link getLastClickedObject} function remain valid.
     * 
     * @returns reference to the last atom that was left-clicked. 
     * If the last left-clicked object does not reference an atom, null is returned.
     */
    public static getLastClickedAtom(): AtomProxy | null {
        return ScriptingApi.getLastClickedObject()?.atom ?? null;
    }

    /**
     * Returns last atom that was hovered-over with a mouse.
     * Constraints of the {@link getLastHoveredObject} function remain valid.
     * 
     * @returns reference to the last atom that was hovered-over. 
     * If the last hovered object does not reference an atom, null is returned.
     */
    public static getLastHoveredAtom(): AtomProxy | null {
        return ScriptingApi.getLastHoveredObject()?.atom ?? null;
    }

    /**
     * Returns last residue that was left-clicked with a mouse.
     * Constraints of the {@link getLastClickedObject} function remain valid.
     * 
     * @returns reference to the last residue that was left-clicked. 
     * If the last left-clicked object does not reference a residue, null is returned.
     */
    public static getLastClickedResidue(): ResidueProxy | CgMonomerProxy | null {
        const p = ScriptingApi.getLastClickedObject();
        if (p) {
            return p.residue ?? p.cgNucleotide ?? p.cgAminoAcid ?? null;
        }

        return null;
    }

    /**
     * Returns last residue that was hovered-over with a mouse.
     * Constraints of the {@link getLastHoveredObject} function remain valid.
     * 
     * @returns reference to the last residue that was hovered-over. 
     * If the last hovered object does not reference a residue, null is returned.
     */
    public static getLastHoveredResidue(): ResidueProxy | CgMonomerProxy | null {
        const p = ScriptingApi.getLastHoveredObject();
        if (p) {
            return p.residue ?? p.cgNucleotide ?? p.cgAminoAcid ?? null;
        }

        return null;
    }

    /**
     * Returns last chain that was left-clicked with a mouse.
     * Constraints of the {@link getLastClickedObject} function remain valid.
     * 
     * @returns reference to the last chain that was left-clicked. 
     * If the last left-clicked object does not reference a chain, null is returned.
     */
    public static getLastClickedChain(): ChainProxy | CgPolymer | null {
        const r = ScriptingApi.getLastClickedResidue();
        if (r) {
            return (r instanceof ResidueProxy) ? r.chain : r.getParentPolymer();
        }
        return null;
    }

    /**
     * Returns last chain that was hovered-over with a mouse.
     * Constraints of the {@link getLastHoveredObject} function remain valid.
     * 
     * @returns reference to the last chain that was hovered-over. 
     * If the last hovered object does not reference a chain, null is returned.
     */
    public static getLastHoveredChain(): ChainProxy | CgPolymer | null {
        const r = ScriptingApi.getLastHoveredResidue();
        if (r) {
            return (r instanceof ResidueProxy) ? r.chain : r.getParentPolymer();
        }
        return null;
    }

    /**
     * Returns last structure that was left-clicked with a mouse.
     * Constraints of the {@link getLastClickedObject} function remain valid.
     * 
     * @returns reference to the last structure that was left-clicked. 
     * If the last left-clicked object does not reference a structure, null is returned.
     */
    public static getLastClickedStructure(): Structure | CgStructure | null {
        const r = ScriptingApi.getLastClickedResidue();
        if (r) {
            return (r instanceof ResidueProxy) ? r.structure : (r.parentStructure ?? null);
        }
        return null;
    }

    /**
     * Returns last structure that was hovered-over with a mouse.
     * Constraints of the {@link getLastHoveredObject} function remain valid.
     * 
     * @returns reference to the last structure that was hovered-over. 
     * If the last hovered object does not reference a structure, null is returned.
     */
    public static getLastHoveredStructure(): Structure | CgStructure | null {
        const r = ScriptingApi.getLastHoveredResidue();
        if (r) {
            return (r instanceof ResidueProxy) ? r.structure : (r.parentStructure ?? null);
        }
        return null;
    }

    /**
     * Shows a prompt enabling to gather user's textual input.
     * 
     * @param message message to show to the user
     * @param defaultValue value pre-filled in the input field
     * @returns text inputted by the user
     */
    public static showPrompt(message: string = "Please provide input:", defaultValue: string = ""): string {
        return window.prompt(message, defaultValue) ?? "";
    }

    /**
     * Shows an alert window.
     * 
     * @param message message to show
     */
    public static showAlert(message: string): void {
        window.alert(message);
    }

    /**
     * Shows a confirm dialog.
     * 
     * @param message message to show to the user
     * @returns true if the user confirmed the dialog (pressed OK), false otherwise
     */
    public static showConfirm(message: string): boolean {
        return window.confirm(message);
    }

    /**
     * Creates a new Modal window with the given content and appends it
     * under the "Plugins" menu in the Top bar.
     * 
     * @param title title of the modal window
     * @param uiElements elements to show in the window
     * 
     * @comment The (intentionally more general) description of this function relies on the fact that frontend part of Catana
     * handles the actual creation of the window, and so on. 
     * In fact, this function just makes a request to create a window but does not actually create one.
     */
    public static addModalWindow(title: string, uiElements: PluginUIElemTypeRecord[]): void {
        ScriptingApi._stage.pluginManager.addModalWindow(title, uiElements);
    }

    /**
     * Returns vector (three-element array) equal to the sum of two provided vectors.
     * 
     * @example
     * const v = ScriptingApi.addVectors([10, 5, 8], [0, 5, 2])
     * // "v" equals to [10, 10, 10]
     * 
     * @param v1 first vector
     * @param v2 second vector
     * @returns sum of vectors {@link v1} and {@link v2}
     */
    public static addVectors(v1: number[], v2: number[]): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v1).add(
                ScriptingApi.arrToVec3(v2))
        );
    }

    /**
     * Returns vector (three-element array) equal to the subtraction of one vector from another.
     * 
     * @param v1 first vector
     * @param v2 second vector
     * @returns vector equal to {@link v1}-{@link v2}
     */
    public static subtractVectors(v1: number[], v2: number[]): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v1).sub(
                ScriptingApi.arrToVec3(v2))
        );
    }

    /**
     * Returns dot product of two provided vectors.
     * 
     * @param v1 first vector
     * @param v2 second vector
     * @returns the value of dot product of {@link v1} and {@link v2}
     */
    public static dotProduct(v1: number[], v2: number[]): number {
        return ScriptingApi.arrToVec3(v1).dot(
            ScriptingApi.arrToVec3(v2));
    }

    /**
     * Returns vector corresponding to the cross product of two provided vectors.
     * 
     * @param v1 first vector
     * @param v2 second vector
     * @returns vector equal to the cross product of {@link v1} and {@link v2}
     */
    public static crossProduct(v1: number[], v2: number[]): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v1).cross(
                ScriptingApi.arrToVec3(v2))
        );
    }

    /**
     * Returns normalized copy of the given vector.
     * 
     * @param v1 input vector
     * @returns normalized input vector
     */
    public static normalizeVector(v1: number[]): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v1).normalize()
        );
    }

    /**
     * Multiplies vector by a scalar.
     * 
     * @param v1 vector 
     * @param a scalar
     * @returns vector equal to {@link a}*{@link v1}
     */
    public static multiplyVectorByScalar(v1: number[], a: number): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v1).multiplyScalar(a)
        );
    }

    /**
     * Returns length of the provided vector.
     * 
     * @param v1 input vector
     * @returns length of the vector
     */
    public static vectorLength(v1: number[]): number {
        return ScriptingApi.arrToVec3(v1).length();
    }

    /**
     * Multiplies vector by the given matrix.
     * 
     * @param matrix input matrix
     * @param v input vector
     * @returns vector equal to {@link matrix}*{@link vector}
     */
    public static multiplyMatrixVector(matrix: number[], v: number[]): number[] {
        return ScriptingApi.vec3ToArr(
            ScriptingApi.arrToVec3(v).applyMatrix4(
                ScriptingApi.arrToMat4(matrix)
            )
        );
    }

    /**
     * Multiplies two (4x4) matrices.
     * 
     * @param m1 first matrix
     * @param m2 second matrix
     * @returns matrix corresponding to {@link m1}*{@link m2}
     */
    public static multiplyMatrixMatrix(m1: number[], m2: number[]): number[] {
        return ScriptingApi.mat4ToArr(
            ScriptingApi.arrToMat4(m1).multiply(
                ScriptingApi.arrToMat4(m2)
            )
        );
    }

    /**
     * Assembles translation matrix of given parameters.
     * 
     * @param transl amount of translation
     * @returns 4x4 transformation matrix
     */
    public static makeTranslationMatrix(transl: number[]): number[] {
        return ScriptingApi.mat4ToArr(new Matrix4().makeTranslation(transl[0], transl[1], transl[2]));
    }

    /**
     * Assembles rotation matrix of given parameters.
     * 
     * @param euler amount of rotation in degrees
     * @returns 4x4 transformation matrix
     */
    public static makeRotationMatrix(euler: number[]): number[] {
        return ScriptingApi.mat4ToArr(
            new Matrix4().makeRotationFromEuler(
                new Euler(
                    degToRad(euler[0]),
                    degToRad(euler[1]),
                    degToRad(euler[2])
                )
            )
        )
    }

    /**
     * Returns matrix corresponding to the inverse of provided matrix.
     * 
     * @param mat input matrix
     * @returns matrix being an inverse of the input matrix
     */
    public static getMatrixInverse(mat: number[]): number[] {
        const m = ScriptingApi.arrToMat4(mat);
        return ScriptingApi.mat4ToArr(
            new Matrix4().getInverse(m)
        );
    }

    /**
     * Creates a GET request targeted at the given resource.
     * Expects that the response is a JSON, that is converted to an object.
     * 
     * @param url resource URL
     * @returns promise resolving with response object 
     */
    public static httpGetObject(url: string): Promise<object> {
        return ScriptingApi.httpGetCommon("json", url);
    }

    /**
    * Creates a GET request targeted at the given resource.
    * Expects that the response is a text/string.
    * 
    * @param url resource URL
    * @returns promise resolving with response text
    */
    public static httpGetText(url: string): Promise<string> {
        return ScriptingApi.httpGetCommon("text", url);
    }

    /**
     * Creates a POST request targeted at the given resource.
     * Body of the request is a JSON created from the provided object.
     * 
     * @param url resource URL
     * @param responseType type of expected response from the server (if set to "json", response data are an object)
     * @param object object to provide as request body
     * @returns promise resolving with response data
     */
    public static httpPostObject(url: string, responseType: "json" | "text", object: { [name: string]: any }): Promise<any> {
        return ScriptingApi.httpPostCommon(url, responseType, JSON.stringify(object), "text/plain");
    }

    /**
    * Creates a POST request targeted at the given resource.
    * Body of the request is a given text.
    * 
    * @param url resource URL
    * @param responseType type of expected response from the server (if set to "json", response data are an object)
    * @param text text to provide as request body
    * @returns promise resolving with response data
    */
    public static httpPostText(url: string, responseType: "json" | "text", text: string): Promise<any> {
        return ScriptingApi.httpPostCommon(url, responseType, text, "text/plain");
    }

    /**
    * Creates a POST request targeted at the given resource.
    * The request is encoded as an URL query string. 
    * 
    * @param url resource URL
    * @param responseType type of expected response from the server (if set to "json", response data are an object)
    * @param object object defining query parameters (object properties) and their values (property values)
    * @returns promise resolving with response data
    */
    public static httpPostUrlQuery(url: string, responseType: "json" | "text", object: { [query: string]: string }): Promise<any> {
        const urlParams = new URLSearchParams();

        for (const [key, value] of Object.entries(object)) {
            urlParams.append(key, value);
        }

        return ScriptingApi.httpPostCommon(url, responseType, urlParams, "application/x-www-form-urlencoded");
    }

    /**
     * Attaches given script to the update call
     * 
     * @param scriptName full name of the script
     */
    public static attachToUpdate(scriptName: string): void {
        const pm = ScriptingApi._stage.pluginManager;
        const scr = pm.getScriptRecord(scriptName);
        if (scr) {
            pm.attachToUpdate(scr.uuid);
        } else {
            Log.error("Script not found: " + scriptName);
        }
    }

    /**
     * Detaches given script from the update call
     * 
     * @param scriptName full name of the script
     */
    public static detachFromUpdate(scriptName: string): void {
        const pm = ScriptingApi._stage.pluginManager;
        const scr = pm.getScriptRecord(scriptName);
        if (scr) {
            pm.detachFromUpdate(scr.uuid);
        } else {
            Log.error("Script not found: " + scriptName);
        }
    }

    private static createDnaPep(seq: string, params:
        Partial<{ dnaDoubleStranded: boolean, compType: "dna" | "protein" | "unknown" }>): Component | null {
        return addComponentFromSequence(seq, ScriptingApi._stage, params) ?? null;
    }

    private static fetchStructureCommon(path: string): Promise<Component | Component[]> {
        return new Promise((resolve, reject) => {
            ScriptingApi._stage.loadFile(path, {
                defaultRepresentation: true
            }).then((comps: Component[]) => {
                if (comps.length === 1) {
                    const sc = comps[0];
                    sc?.autoView();
                    resolve(sc);
                } else {
                    resolve(comps);
                }
            }, reject);
        });
    }

    private static httpGetCommon(type: "json" | "text", url: string): Promise<any> {
        return fetch(url, {
            method: "GET"
        }).then(
            response => {
                if (!response.ok || response.body === null) {
                    Log.error("Error processing response: " + response.statusText);
                }
                return type === "json" ? response.json() : response.text();
            }
        ).catch(
            reason => Log.error("Error processing response: " + reason)
        );
    }

    private static httpPostCommon(url: string, responseType: "json" | "text", body: any, contentType: string): Promise<any> {
        return fetch(url, {
            method: "POST",
            body: body,
            headers: {
                "Content-Type": contentType
            }
        }).then(
            response => {
                if (!response.ok || response.status !== 200) {
                    Log.error("Error processing response: " + response.statusText);
                }
                return responseType === "json" ? response.json() : response.text();
            }
        ).catch(
            reason => Log.error("Error processing response: " + reason)
        );
    }

    private static addShape(shape: Shape, params: any = {}): Component | null {
        const comps = ScriptingApi._stage.addComponentFromObject(shape);

        if (comps.length > 0) {
            comps[0].addRepresentation("buffer", params);
            return comps[0];
        }

        return null;
    }

    private static setRepresentationCommon(comp: string | Component, repr: string | RepresentationElement, callback: (r: RepresentationElement) => void): void {
        const c = ScriptingApi.getComponentReference(comp);
        const comparator =
            repr instanceof RepresentationElement ?
                ((rel: RepresentationElement) => rel === repr) :
                ((rel: RepresentationElement) => rel.repr.type === repr);

        if (c) {
            for (let i = 0; i < c.reprList.length; ++i) {
                if (comparator(c.reprList[i])) {
                    callback(c.reprList[i]);
                }
            }
        }
    }

    private static getComponentReference(comp: string | Component): Component | null {
        return comp instanceof Component ? comp : ScriptingApi.findComponentByString(comp);
    }

    private static findComponentByString(input: string): Component | null {
        // If the string is formatted like UUID, assume UUID as input        
        if (input.length === 36 && input[8] === '-' &&
            input[13] === '-' && input[18] === '-' && input[23] === '-') {
            return ScriptingApi.findComponentWithUuid(input);
        }
        return ScriptingApi.findComponentWithName(input);
    }

    private static arrToVec3(v: number[]): Vector3 {
        return new Vector3().fromArray(v);
    }

    private static vec3ToArr(v: Vector3): number[] {
        return v.toArray();
    }

    private static arrToMat4(m: number[]): Matrix4 {
        return new Matrix4().fromArray(m);
    }

    private static mat4ToArr(m: Matrix4): number[] {
        return m.toArray();
    }
}