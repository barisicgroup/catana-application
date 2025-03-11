import { Vector3 } from "three";
import type RigidBody from "../rigidbody";
import RbCollisionContact from "./rb-collision-contact";
import RbCollisionUtils from "./rb-collision-utils";
import { RbShape } from "./rb-shape";

/**
 * Spherical rigid body shape
 */
export class RbShapeSphere extends RbShape {
    private _radius: number;

    /**
     * @param parentRb parent rigid body
     * @param mass mass of this shape
     * @param radius radius of the sphere (in world-space unit)
     * @param localPosition position of the shape in the local space of the parent
     */
    public constructor(parentRb: RigidBody, mass: number, radius: number,
        localPosition: Vector3 = new Vector3(0, 0, 0)) {
        super(parentRb, mass, localPosition);
        this._radius = radius;

        this.updateMomentOfInertia();
    }

    /**
     * @returns radius of this spherical shape
     */
    public get radius(): number {
        return this._radius;
    }

    /**
     * Sets new radius for this spherical shape
     */
    public set radius(r: number) {
        this._radius = r;
        this.updateMomentOfInertia();
    }

    /** @override */
    public checkCollision(other: RbShape): RbCollisionContact | undefined {
        return RbCollisionUtils.checkAnyAnyCollision(this, other);
    }

    /** @override */
    protected updateMomentOfInertia(): void {
        // Moment of inertia of a sphere
        // https://scienceworld.wolfram.com/physics/MomentofInertiaSphere.html
        // Since the shape can be offset from the rigidbody's center of mass,
        // parallel axis theorem is applied as well.
        // http://hyperphysics.phy-astr.gsu.edu/hbase/parax.html
        const distanceToRbCom = this.localPosition.lengthSq();
        this._momentOfInertia = this.mass * distanceToRbCom + (2.0 * this.mass * Math.pow(this.radius, 2.0)) / 5.0;
    }
}
