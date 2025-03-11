import { Box3 } from "three";
import { ComponentParameters } from "../../component/component";
import { ComponentRegistry } from "../../globals";
import { Component, Stage } from "../../catana";
import AtomProxy from "../../proxy/atom-proxy";
import Representation from "../../representation/representation";
import CgStructure from "../data_model/cg-structure";
import Colormaker from "../../color/colormaker";

/**
 * Component representing an instance of coarse-grained structure.
 */
class CgStructureComponent extends Component {
    constructor(stage: Stage, cgStructure: CgStructure, params: Partial<ComponentParameters> = {}) {
        super(stage, cgStructure, Object.assign({ name: cgStructure.name }, params));

        cgStructure.parentComponent = this;
    }

    public get cgStructure(): CgStructure {
        return this.object as CgStructure;
    }

    public get type(): string {
        return "cg-structure";
    }

    public hasObject(object: any): boolean {
        return super.hasObject(object) ||
            this.cgStructure.atomicStructure === object ||
            this.cgStructure.polymers.some(pol => pol === object) ||
            (Array.isArray(object) && this.cgStructure.polymers.some(pol => object.indexOf(pol) >= 0));
    }

    public getMaxRepresentationRadius(atomIndex: number) {
        if (this.cgStructure) {
            const s = this.cgStructure.atomicStructure;
            if (s != null) {
                const atomProxy = new AtomProxy(s, atomIndex);
                let maxRadius = 0;
                this.eachRepresentation(reprElem => {
                    const repr: Representation = reprElem.repr;
                    if (repr.type === "atomic") {
                        maxRadius = Math.max(repr.getAtomRadius(atomProxy), maxRadius);
                    }
                });
                return maxRadius;
            }
        }
        return 0;
    }

    public getBoxUntransformed(...args: any[]): Box3 {
        return this.cgStructure.getBoundingBox();
    }

    public addRepresentation(type: any, params?: any) {
        return this._addRepresentation(type, this.cgStructure, params);
    }

    public updateRepresentations(what: any) {
        super.updateRepresentations(what);
    }

    public onUpdate(delta: number): void {
        super.onUpdate(delta);
        this.cgStructure?.refreshStructureIfNeeded();
    }

    public dispose() {
        super.dispose();
        this.cgStructure.parentComponent = null;
        this.cgStructure.dispose();
    }

    public updateRepresentationMatrices() {
        super.updateRepresentationMatrices();
    }

    /**
    * Applies this component's transformation to its elements
    * and resets this component placement
    */
    public propagateTransfToElems(): void {
        this.cgStructure.transform(this.matrix);

        this.setPosition([0, 0, 0]);
        this.setRotation([0, 0, 0]);
        this.updateRepresentations({});
    }

    public supportsColorScheme(scheme: any): boolean {
        const p = scheme.prototype;
        return !(p && p instanceof Colormaker) || !!p.monomerColor;
    }
}

ComponentRegistry.add("Coarse-grained Structure", CgStructureComponent);

export default CgStructureComponent;