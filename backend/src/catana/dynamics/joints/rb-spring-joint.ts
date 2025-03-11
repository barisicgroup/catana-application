import { Vector3 } from "three";
import RigidBody from "../rigidbody";
import RbJoint from "./rb-joint";

/**
 * Implementation of a spring-based joint,
 * following the Hooke's law definition:
 * http://labman.phys.utk.edu/phys221core/modules/m3/Hooke's%20law.html
 */
class RbSpringJoint extends RbJoint {
    private _springConstant: number;
    private _restLength: number;

    /**
     * @param rbStart rigid body where the joint starts
     * @param rbStartConnPtLocal point in the local space of the starting rigid body where the connection should start
     * @param rbEnd rigid body where the joint ends
     * @param rbEndConnPtLocal point in the local space of the ending rigid body where the connection should end
     * @param springConstant spring constant
     * @param restLength resting/equilibrium length of the spring
     * @param breakForce how much force is needed to apply to break the spring (if set to Infinity, break force is ignored)
     */
    public constructor(rbStart: RigidBody, rbStartConnPtLocal: Vector3,
        rbEnd: RigidBody, rbEndConnPtLocal: Vector3, springConstant: number, restLength: number, breakForce: number = Infinity) {
        super(rbStart, rbStartConnPtLocal, rbEnd, rbEndConnPtLocal);
        this._springConstant = springConstant;
        this._restLength = restLength;
        this.breakForce = breakForce;
    }

    /**
     * @returns spring constant value
     */
    public get springConstant(): number {
        return this._springConstant;
    }

    /**
     * Sets new spring constant value
     */
    public set springConstant(value: number) {
        this._springConstant = value;
    }

    /**
     * @returns Resting/equilibrium length
     */
    public get restLength(): number {
        return this._restLength;
    }

    /**
     * Sets new resting length
     */
    public set restLength(value: number) {
        this._restLength = value;
    }

    /**
     * @override
     */
    public applyJointForces(): void {
        const startWorldConPoint = this.startRigidBody.localToWorldPos(this.startConnectionPoint);
        const endWorldConPoint = this.endRigidBody.localToWorldPos(this.endConnectionPoint);

        const startEndVector = endWorldConPoint.clone().sub(startWorldConPoint);
        const restoringForce = startEndVector.length() - this.restLength;

        const startToEndForce = startEndVector.normalize().multiplyScalar(-this.springConstant * restoringForce);

        this.endRigidBody.addForceAtPosition(startToEndForce, endWorldConPoint);
        this.startRigidBody.addForceAtPosition(startToEndForce.clone().negate(), startWorldConPoint);
    }
}

export default RbSpringJoint;