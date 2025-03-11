import { Box3, Matrix4, Quaternion, Sphere } from "three";
import { CgMonomerProxy } from "../../catana";
import CgStructureComponent from "../component/cg-structure-component";
import RigidBody from "./rigidbody";
import { RbShapeSphere } from "./shapes/rb-shape-sphere";

/**
 * While the rigid body class (& the core of the engine) is abstracted from any 
 * molecular-related data model, structure cluster encapsulates a list of
 * coarse-grained monomers, treating them as single rigid body object.
 */
class StructureCluster extends RigidBody {
    private _elements: CgMonomerProxy[];
    private _elementsComponents: Set<CgStructureComponent>;

    /**
     * @param elements coarse-grained monomers to be part of this cluster
     */
    public constructor(elements: CgMonomerProxy[]) {
        super();

        this._elements = elements;
        this._elementsComponents = this.getComponents(elements);

        const bs = this.getBoundingSphere();
        this.position = bs.center;
        this.rotation = new Quaternion(0, 0, 0, 1); // Consider now that the initial rotation is simply zero (no big deal with spheres)
        this.shape = new RbShapeSphere(this, 1 /* Mass set to one now */, bs.radius);
    }

    /** @override */
    public updatePosition(dt: number): void {
        super.updatePosition(dt);
        this.updateElementsPositions();

        this._elementsComponents.forEach(comp => {
            comp.requestRepresentationsUpdate();
        });
    }

    /**
     * @returns monomers included in this cluster
     */
    public get elements(): CgMonomerProxy[] {
        return this._elements;
    }

    /**
     * @returns bounding box of this cluster
     */
    public getBoundingBox(): Box3 {
        const b = new Box3();
        for (let i = 0; i < this.elements.length; ++i) {
            b.expandByPoint(this.elements[i].position);
        }
        return b;
    }

    /**
     * @returns bounding sphere of this cluster
     */
    public getBoundingSphere(): Sphere {
        const s = new Sphere();
        const b = this.getBoundingBox();
        b.getBoundingSphere(s);

        return s;
    }

    /**
     * Updates position of individual elements/monomers based on the last
     * performed rigid body transformation. 
     */
    private updateElementsPositions(): void {
        const currTransl = this.currPositionStep;
        const currTranslMatrix = new Matrix4().makeTranslation(currTransl.x, currTransl.y, currTransl.z);
        const translToCenterMatrix = new Matrix4().makeTranslation(-this.position.x, -this.position.y, -this.position.z);
        const translFromCenterMatrix = new Matrix4().makeTranslation(this.position.x, this.position.y, this.position.z);
        const rotationMatrix = new Matrix4().makeRotationFromQuaternion(this.currRotationStep);

        // NOTE this.position already contains the position after the current step
        //      For this reason, the order of multiplication below is as is.

        const matrix = translFromCenterMatrix
            .multiply(rotationMatrix)
            .multiply(translToCenterMatrix)
            .multiply(currTranslMatrix);

        this._elements.forEach(el => {
            el.applyMatrixTransformation(matrix);
        });
    }

    /**
     * Collects components related to this cluster
     * 
     * @param elems elements to consider when collecting components
     * @returns set of components containing the provided elements
     */
    private getComponents(elems: CgMonomerProxy[]): Set<CgStructureComponent> {
        const s = new Set<CgStructureComponent>();

        elems.forEach(e => {
            s.add(e.parentStructure!.parentComponent!);
        });

        return s;
    }
}

export default StructureCluster;

