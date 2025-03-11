import StructureComponent from "../../component/structure-component";
import { Component, getDataInfo, Structure } from "../../catana";
import Stage from "../../stage/stage";
import { appendStructures } from "../../structure/structure-utils";
import Representation from "../../representation/representation";
import RepresentationElement from "../../component/representation-element";
import { Matrix3, Matrix4, OrthographicCamera, PerspectiveCamera, Vector2, Vector3 } from "three";
import CgStructure from "../data_model/cg-structure";
import GlobalIdGenerator from "./global-id-generator";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgAminoAcidChain from "../data_model/cg-amino-acid-chain";
import CgStructureComponent from "../component/cg-structure-component";
import MultiObjectsStorage from "./multi-objects-storage";
import { ComponentParameters } from "../../component/component";
import { convertAllAtomStructureToCoarseGrained } from "../nanomodeling/aa-to-cg-structure-conversion";

export const EPSLON = 0.001;

/**
 * Merges provided all-atom structures into a new structure
 * 
 * @param name name of the new structure
 * @param structures array of structures to be merged
 * @param matrices array of matrices transforming each of the structures.
 * Structure at index i will be transformed by matrix at index i.
 * @returns new structure storing the merged data
 */
export function mergeStructures(name: string, structures: Structure[], matrices?: (undefined | Matrix4)[]): Structure {
    if (structures.length === 0) return new Structure(name);
    let merged: Structure = structures[0].clone();
    for (let i = 1; i < structures.length; ++i) {
        merged = appendStructures(merged, structures[i], matrices ? matrices[i] : undefined);
    }
    merged.name = name;
    return merged;
}

/**
 * Appends all-atom structure from one component to all-atom structure from another component.
 * 
 * @param stage stage instance
 * @param parentStructureComp structure to which the other one will be appended -- will be modified
 * @param structureCompToAppend structure to be appended
 * @param compToStruc callback providing reference to structure from provided component
 * @param parentUpdateCallback function to be called on the {@link parentStructureComp} after the operation
 * @param removeAppended if set to true, the {@link structureCompToAppend} will be removed after the operation
 */
export function appendComponentsContainingStructure(stage: Stage, parentStructureComp: Component, structureCompToAppend: Component,
    compToStruc: (comp: Component) => Structure, parentUpdateCallback: (comp: Component) => void, removeAppended: boolean = true): void {
    // TODO FIXME BUG: When the parentStructureComp is translated/rotated, the behavior of this function is not correct. 
    //                 Solution (?): the atoms should be probably transformed by matrix transitioning from one component system to another (not just appended comp. matrix)
    //                               Something like newComponent.matrix.inverse * appendedComp.matrix * (..) maybe?
    //                               Maybe that different origin of the components will have to be taken into consideration.
    appendStructures(compToStruc(parentStructureComp), compToStruc(structureCompToAppend), structureCompToAppend.matrix);
    if (removeAppended) {
        stage.removeComponent(structureCompToAppend);
    }
    parentUpdateCallback(parentStructureComp);
}

/**
 * Merges all-atom structure components into a new one
 * 
 * @param stage stage instance
 * @param newComponentTitle title of the newly created component
 * @param removeOldComponents if set to true, provided components will be deleted after the operation
 * @param backendMergeOnly if set to true, the new component will be backend-only, i.e., created only in bacgkround without being shown in the UI
 * @param compToStruc callback providing reference to structure based on the component input
 * @param parentUpdateCallback callback to be executed on the component into which the structures are merged after every merge step
 * @param components list of components to be merged
 * @returns reference to new structure component containing structure with the merged data
 */
export function mergeComponentsContainingStructureIntoOne(stage: Stage, newComponentTitle: string, removeOldComponents: boolean,
    backendMergeOnly: boolean, compToStruc: (comp: Component) => Structure,
    parentUpdateCallback: (comp: Component) => void, ...components: Component[]): StructureComponent {
    let resultStructure = new Structure();
    let resultStructureComp = new StructureComponent(stage, resultStructure, {
        backendOnly: backendMergeOnly
    });

    resultStructure.name = resultStructure.title = newComponentTitle;
    resultStructureComp.setName(newComponentTitle);

    components.forEach(component => {
        appendComponentsContainingStructure(stage, resultStructureComp, component, compToStruc, parentUpdateCallback, removeOldComponents);
    });

    if (!backendMergeOnly) {
        stage.addComponent(resultStructureComp);
        stage.defaultFileRepresentation(resultStructureComp);
    }

    return resultStructureComp;
}

/**
 * Appends all-atom structure from one component to all-atom structure from another component
 * 
 * @param stage stage instance
 * @param parentStructureComp structure (component) to append to
 * @param structureCompToAppend structure (component) to be appended
 * @param removeAppended if set to true, {@link structureCompToAppend} will be removed after the operation
 */
export function appendStructureComponents(stage: Stage, parentStructureComp: StructureComponent,
    structureCompToAppend: StructureComponent, removeAppended: boolean = true): void {
    appendComponentsContainingStructure(stage, parentStructureComp, structureCompToAppend,
        comp => (comp as StructureComponent).structure,
        comp => (comp as StructureComponent).rebuildRepresentations(),
        removeAppended);
}

/**
 * Merges all-atom structure components into a new one
 * 
 * @param stage stage instance
 * @param newComponentTitle title of the newly created component
 * @param removeOldComponents if set to true, provided components will be deleted after the operation
 * @param backendMergeOnly if set to true, the new component will be backend-only, i.e., created only in bacgkround without being shown in the UI
 * @param components list of components to be merged
 * @returns reference to new structure component containing structure with the merged data
 */
export function mergeStructureComponentsIntoOne(stage: Stage, newComponentTitle: string, removeOldComponents: boolean,
    backendMergeOnly: boolean, ...components: StructureComponent[]): StructureComponent {
    return mergeComponentsContainingStructureIntoOne(stage, newComponentTitle,
        removeOldComponents, backendMergeOnly,
        comp => (comp as StructureComponent).structure,
        comp => (comp as StructureComponent).rebuildRepresentations(),
        ...components);
}

/**
 * Duplicates component (deep copy) containing all-atom or coarse-grained structure
 * 
 * @param stage stage instance
 * @param component structure component to be duplicated
 * @param compParams additional component parameters
 * @returns new component being duplicate of the inputted one
 */
export function duplicateComponentContainingStructure(stage: Stage, component: StructureComponent | CgStructureComponent, compParams: Partial<ComponentParameters> = {}): Component {
    let newComp: Component;
    let defaultAssembly: string = "";

    if (compParams.name === undefined) {
        compParams.name = component.name + " (Copy)";
    }

    if (component instanceof StructureComponent) {
        newComp = stage.addComponentFromObject(component.structure.clone(), compParams)[0];
        defaultAssembly = component.parameters.defaultAssembly;
    } else {
        newComp = stage.addComponentFromObject(new MultiObjectsStorage([component.cgStructure.clone()]), compParams)[0];
    }

    stage.defaultFileRepresentation(newComp);

    // Must be after the stage.defaultFileRepresentation call to override its settings
    if (defaultAssembly.length > 0 && newComp instanceof StructureComponent) {
        newComp.setDefaultAssembly(defaultAssembly);
    }

    newComp.setPosition(component.position);
    newComp.setRotation(component.quaternion);

    newComp.updateRepresentationMatrices();

    return newComp;
}

/**
 * @returns current cursor style being used by the document body
 */
export function getCursorType(): string {
    return document.body.style.cursor;
}

/**
 * Sets new cursor style to be used by the document body
 * @param newStyle new style to use
 */
export function setCursorType(newStyle: string): void {
    document.body.style.cursor = newStyle;
}

/**
 * Sets new cursor style using a cursor located at given URL
 * 
 * @param newStyleUrl URL with the cursor visuals
 */
export function setCursorTypeUrl(newStyleUrl: string): void {
    setCursorType("url(\"" + newStyleUrl + "\"), auto");
}

/**
 * Sets new cursor style from those predefined in Catana
 * 
 * @param newStyle style to set
 */
export function setCursorTypeCustom(newStyle: "change" | "remove" | "plus"): void {
    setCursorTypeUrl(getDataInfo("catana://cursors/" + newStyle + ".cur").src as string);
}

/**
 * During rendering, each buffer is assigned a unique 'oid' (object ID?)
 * Using that, this function finds which representation contains a buffer with this 'oid'
 */
export function getRepresentationByOid(src: Component | Stage, oid_target: number): null | Representation {
    let ret: null | Representation = null;
    src.eachRepresentation((reprElem: RepresentationElement) => {
        const r = reprElem.repr;
        for (let j = 0; j < r.bufferList.length; ++j) {
            const oid = r.bufferList[j].pickingUniforms.objectId.value;
            if (ret === null && oid === oid_target) ret = r;
        }
    });
    return ret;
}

/**
 * Gets point on line closest to another line
 * @see https://math.stackexchange.com/questions/1993953/closest-points-between-two-lines
 * 
 * @param line1_pos1 line 2 start point
 * @param line1_pos2 line 2 end point
 * @param line2_pos1 line 1 start point
 * @param line2_pos2 line 1 end point
 * @returns point on line 1 closest to line 2
 */
export function getPointOnLine1ClosestToLine2(line1_pos1: Vector3, line1_pos2: Vector3, line2_pos1: Vector3, line2_pos2: Vector3): Vector3 {
    // Yes, line1 is defined using line2_pos1 and line2_pos2...
    // ...and line2 is defined using line1_pos1 and line1_pos2 :)

    // line1
    const P1 = line2_pos1;
    const V1 = line2_pos2.clone().sub(line2_pos1).normalize();

    // line2
    const P2 = line1_pos1;
    const V2 = line1_pos2.clone().sub(line1_pos1).normalize();

    // line3
    // P3 is what we want to find! It will lie on line1, while being closest to line2, and will be returned
    const V3 = V2.clone().cross(V1).normalize();

    const P1P2 = P2.clone().sub(P1);
    const projV1 = V1.clone().multiplyScalar(P1P2.dot(V1));
    const projV3 = V3.clone().multiplyScalar(P1P2.dot(V3));

    const rejection = P1P2.clone().sub(projV1).sub(projV3);

    const numerator = V2.clone().multiplyScalar(rejection.length());
    const denominator = V2.dot(rejection.normalize());
    const P3 = P2.clone().sub(numerator.divideScalar(denominator));

    return P3;
}

/**
 * Returns point of intersection of line and plane
 * 
 * @param line_pos1 point 1 on line
 * @param line_pos2 point 2 on line
 * @param plane_pos point on plane
 * @param plane_normal normal of the plane
 * @returns point of intersection or null if there is no intersection
 */
export function getIntersectionPointOfLineAndPlane(line_pos1: Vector3, line_pos2: Vector3, plane_pos: Vector3, plane_normal: Vector3): null | Vector3 {
    const L1 = line_pos1;
    const L2 = line_pos2;

    const PP = plane_pos;
    const PN = plane_normal;

    const L1L2 = L2.clone().sub(L1);
    const dot = PN.dot(L1L2);

    if (Math.abs(dot) < EPSLON) return null; // Line is parallel to plane

    const PPtoL1 = L1.clone().sub(PP);
    const fac = -PN.dot(PPtoL1) / dot;
    const L1toPlane = L1L2.clone().multiplyScalar(fac);
    const PP2 = L1.clone().add(L1toPlane);

    return PP2;
}

/**
 * Returns 3x3 matrix assembled from three vectors as rows
 * 
 * @example 
 * row1 = (1, 2, 3), row2 = (4, 5, 6), row3 = (7, 8, 9)
 * matrix = (1 2 3)
 *          (4 5 6)
 *          (7 8 9)
 * 
 * @param row1 first row
 * @param row2 second row
 * @param row3 third row
 * @returns 3x3 matrix
 */
export function getMatrix3FromRowVectors(row1: Vector3, row2: Vector3, row3: Vector3): Matrix3 {
    return new Matrix3().set(row1.x, row1.y, row1.z,
        row2.x, row2.y, row2.z,
        row3.x, row3.y, row3.z);
}

/**
 * Returns 3x3 matrix assembled from three vectors as columns
 * 
 * @example 
 * column1 = (1, 2, 3), column2 = (4, 5, 6), column3 = (7, 8, 9)
 * matrix = (1 4 7)
 *          (2 5 8)
 *          (3 6 9)
 * 
 * @param column1 first column
 * @param column2 second column
 * @param column3 third column
 * @returns 3x3 matrix
 */
export function getMatrix3FromColumnVectors(column1: Vector3, column2: Vector3, column3: Vector3): Matrix3 {
    return new Matrix3().set(column1.x, column2.x, column3.x,
        column1.y, column2.y, column3.y,
        column1.z, column2.z, column3.z);
}

/**
 * Fills in top-left 3x3 corner of 4x4 identity matrix with provided 3x3 matrix data
 */
export function getMatrix4FromMatrix3(m: Matrix3): Matrix4 {
    const e = m.elements;
    return new Matrix4().set(e[0], e[3], e[6], 0,
        e[1], e[4], e[7], 0,
        e[2], e[5], e[8], 0,
        0, 0, 0, 1);
}

export function getCameraPointOnPlane(camera: PerspectiveCamera | OrthographicCamera, worldPos: Vector3, planePos: Vector3): Vector3 {
    const camDir = new Vector3();
    camera.getWorldDirection(camDir);
    const planeNormal = camDir.negate();
    const intersection = getIntersectionPointOfLineAndPlane(
        camera.position.clone(), worldPos, planePos, planeNormal);
    return intersection || worldPos;
}

export function getStageCameraPointOnPlane(stage: Stage, planePos: Vector3): Vector3 {
    const camera = stage.viewer.cameraTransformed;
    const worldPos = stage.mouseObserver.getWorldPosition();
    return getCameraPointOnPlane(camera, worldPos, planePos);
}

/**
 * Gets clockwise angle between vectors with respect to axis
 * @see https://stackoverflow.com/questions/14066933/direct-way-of-computing-clockwise-angle-between-2-vectors
 */
export function getCWAngleBetween3DVectorsWRTAxis(v1: Vector3, v2: Vector3, axis: Vector3): number {
    axis = axis.clone().normalize();
    const matrix = getMatrix3FromRowVectors(v1, v2, axis);
    const det = matrix.determinant();
    const dot = v1.dot(v2);
    return Math.atan2(det, dot); // In range [-pi, pi]
}

export function getCWAngleBetween2DVectors(v1: Vector2, v2: Vector2): number {
    const dot = v1.dot(v2);
    const det = v1.x * v2.y - v2.x * v1.y;
    return Math.atan2(det, dot); // In range [-pi, pi]
}

/**
 * Returns random perpendicular vector to the given vector
 * 
 * @param vct input vector
 * @returns perpendicular vector
 */
export function getPerpendicularVector(vct: Vector3): Vector3 {
    if (vct.length() === 0.0) {
        return vct;
    }

    const vectorsToTest = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

    let minDotProduct: number = Number.MAX_SAFE_INTEGER;
    let minDotProductIdx: number = 0;

    for (let i = 0; i < vectorsToTest.length; ++i) {
        const res = vct.dot(vectorsToTest[i]);
        if (res < minDotProduct) {
            minDotProduct = res;
            minDotProductIdx = i;
        }
    }

    return vectorsToTest[minDotProductIdx].cross(vct);
}

function _permutateRecursive<Type>(sourceIndex: number, dataArray: Type[],
    resultingArray: Type[][], currentData: Type[], remainingLength: number): void {

    currentData.push(dataArray[sourceIndex]);
    remainingLength -= 1;

    if (remainingLength <= 0) {
        resultingArray.push(currentData);
        return;
    }

    for (let i = 0; i < dataArray.length; ++i) {
        if (i !== sourceIndex && currentData.indexOf(dataArray[i]) < 0) {
            _permutateRecursive(i, dataArray, resultingArray,
                currentData.slice(), remainingLength);
        }
    }
}

/**
 * Generates permutations of the given array, where each permutation 
 * has a given length.
 * 
 * @param input array
 * @param length length of the permutations
 * @returns array of permutations, each element of this array is an array of length {@link length}
 */
export function permutations<Type>(array: Type[], length: number): Type[][] {
    if (length <= 0 || length > array.length) {
        return [];
    }

    const result: Type[][] = [];

    for (let i = 0; i < array.length; ++i) {
        _permutateRecursive(i, array, result, [], length);
    }

    return result;
}

/**
 * Appends given structure to the parent structure, by changing parent reference of polymers from
 * the structure being appended.
 * 
 * @param parentStructure structure to which to append
 * @param structureToAppend Structure to be appended. May contain invalid data after the operation!
 * @param appendedStructureTransformation transformation of the structure to append
 * @returns reference to {@link parentStructure} storing polymers from both structures
 */
export function appendCgStructuresShallow(parentStructure: CgStructure, structureToAppend: CgStructure,
    appendedStructureTransformation?: Matrix4): CgStructure {
    const strands = new Array<CgNucleicAcidStrand>();
    const idsMap = new Map<number, number>();

    structureToAppend.forEachNaStrand(naStrand => {
        if (appendedStructureTransformation) {
            naStrand.applyMatrixTransformation(appendedStructureTransformation);
        }

        strands.push(naStrand);

        parentStructure.addNaStrand(naStrand);
        naStrand.name = parentStructure.generateChainName();
        naStrand.globalId = GlobalIdGenerator.generateId();
        naStrand.renumberMonomerGlobalIds(idsMap);
    });

    strands.forEach(naStrand => {
        naStrand.updatePairIds(idsMap);
    });

    structureToAppend.forEachAaChain(aaChain => {
        if (appendedStructureTransformation) {
            aaChain.applyMatrixTransformation(appendedStructureTransformation);
        }

        parentStructure.addAaChain(aaChain);
        aaChain.name = parentStructure.generateChainName();
        aaChain.globalId = GlobalIdGenerator.generateId();
        aaChain.renumberMonomerGlobalIds();
    });

    structureToAppend.removeAllPolymers(false);

    return parentStructure;
}

/**
 * Appends given structure to the parent structure while preserving the source structure intact
 * 
 * @param parentStructure structure to which to append
 * @param structureToAppend structure to be appended
 * @param appendedStructureTransformation transformation of the structure to append
 * @returns reference to {@link parentStructure} storing polymers from both structures
 */
export function appendCgStructures(parentStructure: CgStructure, structureToAppend: CgStructure,
    appendedStructureTransformation?: Matrix4): CgStructure {
    const strands = new Array<CgNucleicAcidStrand>();
    const idsMap = new Map<number, number>();

    structureToAppend.forEachNaStrand(naStrand => {
        const newStrand = new CgNucleicAcidStrand(GlobalIdGenerator.generateId(),
            parentStructure.generateChainName(), naStrand.naType, parentStructure, naStrand.length);
        // TODO Some clone method or constructor on strand would be better than to remember the values to copy.
        //      Or object reflection combined with decorators somehow to declare properties to be copied
        //      using a decorator when defining it?
        newStrand.customColor = naStrand.customColor;
        newStrand.isScaffold = naStrand.isScaffold;
        newStrand.isCircular = naStrand.isCircular;

        newStrand.copyFrom(naStrand, 0, naStrand.length);
        newStrand.renumberMonomerGlobalIds(idsMap);
        if (appendedStructureTransformation) {
            newStrand.applyMatrixTransformation(appendedStructureTransformation);
        }

        parentStructure.addNaStrand(newStrand);
        strands.push(newStrand);
    });

    strands.forEach(naStrand => {
        naStrand.updatePairIds(idsMap);
    });

    structureToAppend.forEachAaChain(aaChain => {
        const newChain = new CgAminoAcidChain(GlobalIdGenerator.generateId(),
            parentStructure.generateChainName(), parentStructure, aaChain.length);
        newChain.customColor = aaChain.customColor;

        newChain.copyFrom(aaChain, 0, aaChain.length);
        newChain.renumberMonomerGlobalIds();
        if (appendedStructureTransformation) {
            newChain.applyMatrixTransformation(appendedStructureTransformation);
        }

        parentStructure.addAaChain(newChain);
    });

    return parentStructure;
}

/**
 * Duplicates given coarse-grained structure
 * 
 * @param cgStructure structure to duplicate
 * @returns new coarse-grained structure being the duplicate of the provided one
 */
export function duplicateCgStructure(cgStructure: CgStructure): CgStructure {
    const duplicatedCgStructure = new CgStructure(GlobalIdGenerator.generateId(),
        cgStructure.name, cgStructure.author);
    return appendCgStructures(duplicatedCgStructure, cgStructure);
}

/**
 * Appends one structure component to another one.
 * Both all-atom and coarse-grained components are supported.
 * 
 * @param component component to which to append
 * @param otherComp component to be appended. It will be hidden/made invisible after the operation.
 */
export function appendAnyStructureComps(component: StructureComponent | CgStructureComponent, otherComp: StructureComponent | CgStructureComponent): void {
    let thisStructure =
        component instanceof StructureComponent ?
            component.structure :
            (component as CgStructureComponent).cgStructure;

    let otherStructure =
        otherComp instanceof StructureComponent ?
            otherComp.structure :
            (otherComp as CgStructureComponent).cgStructure;

    const transfMatrix = new Matrix4().getInverse(component.matrix).clone().multiply(otherComp.matrix);
    let instantUpdate = true;
    let updFunc = () => {
        otherComp.setVisibility(false);
        // All calls are needed currently...
        (component as any).updateRepresentations({});
        (component as any).rebuildRepresentations();
        component.stage.viewer.requestRender();
    };

    if (thisStructure instanceof CgStructure && otherStructure instanceof CgStructure) {
        appendCgStructures(thisStructure, otherStructure, transfMatrix);
    } else if (thisStructure instanceof Structure && otherStructure instanceof Structure) {
        appendStructures(thisStructure, otherStructure, transfMatrix);
    } else if (thisStructure instanceof CgStructure && otherStructure instanceof Structure) {
        const otherCg = convertAllAtomStructureToCoarseGrained(otherStructure);
        appendCgStructuresShallow(thisStructure, otherCg, transfMatrix);
    } else if (thisStructure instanceof Structure && otherStructure instanceof CgStructure) {
        instantUpdate = false;
        otherStructure.buildAtomicStructure().then(otherAaStruc => {
            appendStructures(thisStructure as Structure, otherAaStruc, transfMatrix);
            updFunc();
        });
    }

    if (instantUpdate) {
        updFunc();
    }
}

/**
 * Converts given coarse-grained structure component to all-atom structure component.
 * Old component is removed during the process.
 * 
 * @param stage stage instance
 * @param component component to convert
 * @returns promise resolving with the newly created all-atom structure component
 */
export function convertCgStrucCompToAaStrucComp(stage: Stage, component: CgStructureComponent): Promise<StructureComponent> {
    return new Promise((resolve, reject) => {
        component.cgStructure.buildAtomicStructure().then(aaStruc => {
            const newComps = stage.addComponentFromObject(aaStruc);
            const nc = newComps[0] as StructureComponent;

            nc.setPosition(component.position);
            nc.setRotation(component.quaternion);

            stage.removeComponent(component);
            stage.defaultFileRepresentation(newComps[0]);

            resolve(nc);
        }).catch(reject);
    });
}

/**
 * Converts given all-atom structure component to coarse-grained structure component.
 * Old component is removed during the process.
 * 
 * @param stage stage instance
 * @param component component to convert 
 * @returns promise resolving with the newly created coarse-grained structure component
 */
export function convertAaStrucCompToCgStrucComp(stage: Stage, component: StructureComponent): Promise<CgStructureComponent> {
    return new Promise((resolve, reject) => {
        try {
            const cgStruc = convertAllAtomStructureToCoarseGrained(component.structure);
            const newComps = stage.addComponentFromObject(new MultiObjectsStorage([cgStruc]));
            const c = newComps[0] as CgStructureComponent;

            c.setPosition(component.position);
            c.setRotation(component.quaternion);

            stage.defaultFileRepresentation(c);

            // TODO nasty hot fix... remove at some point :)
            const reprElem: any = c.addRepresentation("atomic", {});
            if (reprElem instanceof RepresentationElement) {
                const r = reprElem.repr;
                r.setVisibility(false);
            }

            // TODO This is necessary or the representation is not updated
            //      However, this should not be needed – fix the representations.
            c.updateRepresentationMatrices();

            stage.removeComponent(component);
            resolve(c);
        } catch (e) {
            reject(e);
        }
    });
}