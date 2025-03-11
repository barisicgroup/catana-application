import { Vector3 } from "three";
import RigidBody from "../rigidbody";
import RbCollisionContact from "./rb-collision-contact";
import RbCollisionUtils from "./rb-collision-utils";
import RbShape from "./rb-shape";

/**
 * Compound shape consists of several 
 * other shapes placed at the desired positions of the rigid body
 */
class RbCompoundShape extends RbShape {
    private _shapes: RbShape[];
    private _totalMass: number;

    /**
     * @param parentRb parent rigid body
     * @param shapes shapes creating this rigid body
     */
    public constructor(parentRb: RigidBody, ...shapes: RbShape[]) {
        const totalMass = shapes.reduce((sum, curr) => sum + curr.mass, 0);

        super(parentRb, totalMass, new Vector3(0, 0, 0));

        this._shapes = shapes;
        this._totalMass = totalMass;

        this.updateMomentOfInertia();
    }

    /**
     * @returns shapes this rigid body is made of
     */
    public get shapes(): RbShape[] {
        return this._shapes;
    }

    /** @override */
    public get mass(): number {
        return this._totalMass;
    }

    /**
     * Mass property setter does nothing
     * as the mass is determined by the underlying
     * shapes.
     * 
     * @override
     */
    public set mass(m: number) {
        // Intentionally empty
        // ---
        // It is currently expected that the mass is uniquely determined
        // by the individual shapes creating this compound collider.
    }

    /** @override */
    public checkCollision(other: RbShape): RbCollisionContact | undefined {
        return RbCollisionUtils.checkAnyAnyCollision(this, other);
    }

    /** @override */
    protected updateMomentOfInertia(): void {
        // https://engineeringstatics.org/Chapter_10-moment-of-inertia-of-composite-shapes.html#Chapter_10-composite-area-method
        this._momentOfInertia = this.shapes.reduce((sum, curr) => sum + curr.momentOfInertia, 0);
    }
}

export default RbCompoundShape;