import { Vector3 } from "three";
import type RigidBody from "../rigidbody";
import type RbCollisionContact from "./rb-collision-contact";

/**
 * Base class for the description of rigid body shapes / colliders
 */
export abstract class RbShape {
    private readonly _parentRigidBody: RigidBody;
    private _mass: number;
    private _localPosition: Vector3;
    // TODO Add local rotation

    protected _momentOfInertia: number;

    /**
     * @param parentRb rigid body owning this shape
     * @param mass shape mass
     * @param localPosition position of this shape w.r.t the local space of the parent rigid body 
     */
    protected constructor(parentRb: RigidBody, mass: number, localPosition: Vector3) {
        this._parentRigidBody = parentRb;
        this._mass = mass;
        this._localPosition = localPosition;
    }

    /**
     * @returns parent rigid body
     */
    public get parentRigidBody(): RigidBody {
        return this._parentRigidBody;
    }

    /**
     * @returns mass of this shape
     */
    public get mass(): number {
        return this._mass;
    }

    /**
     * Sets new mass for this shape
     */
    public set mass(m: number) {
        this._mass = m;
        this.updateMomentOfInertia();
    }

    /**
     * @returns position of this shape in the local space of the parent
     */
    public get localPosition(): Vector3 {
        return this._localPosition;
    }

    /**
     * @returns world position of this shape
     */
    public get worldPosition(): Vector3 {
        return this.parentRigidBody.localToWorldPos(this.localPosition);
    }

    /**
     * Checks for collision with other shape. 
     * 
     * @param other shape to check collision with
     */
    public abstract checkCollision(other: RbShape): RbCollisionContact | undefined;

    /**
     * @returns moment of inertia of this shape
     */
    public get momentOfInertia() {
        return this._momentOfInertia;
    }

    /**
     * Updates moment of inertia of this shape
     */
    protected abstract updateMomentOfInertia(): void;
}

export default RbShape;