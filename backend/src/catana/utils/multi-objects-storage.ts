import { Matrix4, Quaternion, Vector3 } from "three";
import Component from "../../component/component";
import Shape from "../../geometry/shape";
import { ColormakerRegistry } from "../../globals";
import Structure from "../../structure/structure";
import Surface from "../../surface/surface";
import Volume from "../../surface/volume";
import CgStructure from "../data_model/cg-structure";
import Lattice from "../nanomodeling/lattices/lattice";

export interface VisualizationProperties {
    representations: string[],
    filterStrings: string[],
    // Filter color schemes array
    // Passed to ColormakerRegistry.addFilterScheme
    colorSchemes: any[]
}

type TObj = Structure | Surface | Volume | Shape | CgStructure | Lattice;

/**
 * This class can be used when parsing files containing objects of
 * different type (e.g., coarse-grained structure and all-atomistic one)
 * which should result in multiple components being created.
 */
export class MultiObjectsStorage {
    private _storedObjects: TObj[];

    // The individual components can be instantiated with some of their properties 
    // being already assigned based on the values in the following arrays.
    // Index i in the objects array corresponds to the same index in these arrays.
    private _componentTransformations: (Matrix4 | undefined)[];
    private _visibilityStatus: (boolean | undefined)[];
    private _visualizationProperties: (VisualizationProperties | undefined)[];

    public constructor(objects?: TObj[]) {
        this.storedObjects = objects ?? [];
    }

    public get type(): string {
        return "Multiobjects Storage";
    }

    public get storedObjects(): TObj[] {
        return this._storedObjects;
    }

    public set storedObjects(objects: TObj[]) {
        this._storedObjects = objects;
        this._componentTransformations = new Array<Matrix4 | undefined>(this._storedObjects.length);
        this._visibilityStatus = new Array<boolean | undefined>(this._storedObjects.length);
        this._visualizationProperties = new Array<VisualizationProperties | undefined>(this._storedObjects.length);
    }

    public setComponentTransformation(i: number, position: Vector3, rotation: Quaternion): void {
        if (this._componentTransformations.length <= i) {
            for (let j = this._componentTransformations.length; j <= i; ++j) {
                this._componentTransformations[j] = undefined;
            }
        }
        this._componentTransformations[i] = new Matrix4().compose(position, rotation, new Vector3(1, 1, 1));
    }

    public getComponentTransformation(i: number): Matrix4 | undefined {
        return this._componentTransformations[i];
    }

    public setComponentVisibility(i: number, isVisible: boolean): void {
        if (this._visibilityStatus.length <= i) {
            for (let j = this._visibilityStatus.length; j <= i; ++j) {
                this._visibilityStatus[j] = undefined;
            }
        }
        this._visibilityStatus[i] = isVisible;
    }

    public getComponentVisibility(i: number): boolean | undefined {
        return this._visibilityStatus[i];
    }

    public setVisualizationProperties(i: number, prop: VisualizationProperties): void {
        if (this._visualizationProperties.length <= i) {
            for (let j = this._visualizationProperties.length; j <= i; ++j) {
                this._visualizationProperties[j] = undefined;
            }
        }
        this._visualizationProperties[i] = prop;
    }

    public getVisualizationProperties(i: number): VisualizationProperties | undefined {
        return this._visualizationProperties[i];
    }

    public applyStoredDataToComponent(srcObject: TObj, index: number, newComp: Component): void {
        const transform = this.getComponentTransformation(index);
        const visibleState = this.getComponentVisibility(index);
        const visProp = this.getVisualizationProperties(index);

        if (transform !== undefined) {
            let pos: Vector3 = new Vector3();
            let quat: Quaternion = new Quaternion();

            transform.decompose(pos, quat, new Vector3());

            newComp.setPosition(pos);
            newComp.setRotation(quat);
        }

        if (visibleState !== undefined) {
            newComp.setVisibility(visibleState);
        }

        if (visProp !== undefined) {
            for (let i = 0; i < visProp.representations.length; ++i) {
                const colSchemes = visProp.colorSchemes.length > i ? visProp.colorSchemes[i] : undefined;
                const filter = visProp.filterStrings.length > i ? visProp.filterStrings[i] : undefined;

                const reprElem = newComp.addRepresentation(visProp.representations[i], {});

                if (filter) {
                    reprElem.setFilter(filter);
                }

                const colSchemeId = ColormakerRegistry.addFilterScheme(colSchemes as any);
                reprElem.setColor(colSchemeId);
                reprElem.update({});
            }
        }
    }
}

export default MultiObjectsStorage;