import { Vector3 } from "three";
import RigidBody from "../rigidbody";

/**
 * Class carrying information about single collision contact between two rigid bodies
 */
class RbCollisionContact {
    /**
     * Rigid body detecting this contact
     */
    private _sourceBody: RigidBody;

    /**
     * Rigid body causing the collision
     */
    private _collidingBody: RigidBody;

    /**
     * Point of source rigid body deepest in the colliding body
     */
    private _srcPointInColl: Vector3;

    /**
     * Point of colliding rigid body deepest in the source body
     */
    private _collPointInSrc: Vector3;

    /**
     * @param srcBody rigid body detecting this contact
     * @param collBody rigid body causing this contact
     * @param srcPointInColl point of source rigid body deepest in the colliding body
     * @param collPointInSrc point of colliding rigid body deepest in the source body
     */
    public constructor(srcBody: RigidBody, collBody: RigidBody,
        srcPointInColl: Vector3, collPointInSrc: Vector3) {
        this._sourceBody = srcBody;
        this._collidingBody = collBody;
        this._srcPointInColl = srcPointInColl;
        this._collPointInSrc = collPointInSrc;
    }

    /**
    * @returns rigid body detecting this contact
    */
    public get sourceBody(): RigidBody {
        return this._sourceBody;
    }

    /**
     * @returns rigid body causing the collision
     */
    public get collidingBody(): RigidBody {
        return this._collidingBody;
    }

    /**
     * @returns point of source rigid body deepest in the colliding body
     */
    public get srcPointInColl(): Vector3 {
        return this._srcPointInColl;
    }

    /**
     * @returns point of colliding rigid body deepest in the source body
     */
    public get collPointInSrc(): Vector3 {
        return this._collPointInSrc;
    }

    /**
     * @returns normal vector of the collision
     */
    public get normal(): Vector3 {
        return this.getSrcToCollPtsVector().normalize();
    }

    /**
     * @returns depth of the collision (objects' intersection)
     */
    public get depth(): number {
        return this.getSrcToCollPtsVector().length();
    }

    private getSrcToCollPtsVector(): Vector3 {
        return this._collPointInSrc.clone().sub(this._srcPointInColl);
    }
}

export default RbCollisionContact;