import { Vector3 } from "three";
import RigidBody from "../rigidbody";

/**
 * Joint representing a connection between two rigid bodies 
 */
abstract class RbJoint {
    private readonly _rbStart: RigidBody;
    private readonly _rbStartConnPtLocal: Vector3;

    private readonly _rbEnd: RigidBody;
    private readonly _rbEndConnPtLocal: Vector3;

    private _breakForce: number;
    protected _isBroken: boolean;

    /**
     * @param rbStart rigid body where the joint starts
     * @param rbStartConnPtLocal point in the local space of the starting rigid body where the connection should start
     * @param rbEnd rigid body where the joint ends
     * @param rbEndConnPtLocal point in the local space of the ending rigid body where the connection should end
     */
    public constructor(rbStart: RigidBody, rbStartConnPtLocal: Vector3,
        rbEnd: RigidBody, rbEndConnPtLocal: Vector3) {
        this._rbStart = rbStart;
        this._rbEnd = rbEnd;

        this._rbStartConnPtLocal = rbStartConnPtLocal;
        this._rbEndConnPtLocal = rbEndConnPtLocal;

        this._breakForce = Infinity;
        this._isBroken = false;
    }

    /**
     * @returns reference to rigid body where the joint starts
     */
    public get startRigidBody(): RigidBody {
        return this._rbStart;
    }

    /**
     * @returns reference to rigid body where the join ends
     */
    public get endRigidBody(): RigidBody {
        return this._rbEnd;
    }

    /**
     * @returns connection point in the local space of the starting rigid body
     */
    public get startConnectionPoint(): Vector3 {
        return this._rbStartConnPtLocal;
    }

    /**
     * @returns connection point in the local space of the ending rigid body
     */
    public get endConnectionPoint(): Vector3 {
        return this._rbEndConnPtLocal;
    }

    /**
     * @returns amount of force needed to break (basically tear-apart) this joint.
     */
    public get breakForce(): number {
        return this._breakForce;
    }

    /**
     * Sets amount of force needed to break (basically tear-apart) this joint.
     * Once the joint has been broken, setting new force cannot "repair" it.
     */
    public set breakForce(value: number) {
        if (!this.isBroken) {
            this._breakForce = value;
        }
    }

    /**
     * @returns true if this joint is broken, i.e., not applying 
     * any force to connected rigid bodies. Otherwise false.
     */
    public get isBroken(): boolean {
        return this._isBroken;
    }

    /**
     * Applies forces to the connected rigid bodies if not broken.
     */
    public applyForces(): void {
        if (this.breakForce === Infinity) {
            this.applyJointForces();
        } else if (!this.isBroken) {
            if (!this.shouldBreak()) {
                this.applyJointForces();
            }
        }
    }

    /**
     * Applies forces to the connected rigid bodies.
     */
    protected abstract applyJointForces(): void;

    /**
     * Checks if this joint undergoes forces high enough to break it.
     * 
     * @returns true if the forces exceed the maximum break force and the joint should break.
     */
    private shouldBreak(): boolean {
        const f1 = this.startRigidBody.getCurrentForce();
        const f2 = this.endRigidBody.getCurrentForce();

        const p1 = this.startRigidBody.localToWorldPos(this.startConnectionPoint);
        const p2 = this.endRigidBody.localToWorldPos(this.endConnectionPoint);

        const jointVector = p2.clone().sub(p1);

        const f1proj = f1.projectOnVector(jointVector);
        const f2proj = f2.projectOnVector(jointVector);

        const appliedForce = f1proj.sub(f2proj).length();
        const shouldBreak = appliedForce >= this.breakForce;

        if (shouldBreak) {
            this._isBroken = true;
        }

        return shouldBreak;
    }
}

export default RbJoint;