import { Quaternion, Vector3 } from "three";
import RbShape from "./shapes/rb-shape";
import { RbShapeSphere } from "./shapes/rb-shape-sphere";

/**
 * Class implementing single rigid body, i.e., a rigid object involved
 * in the rigid body physics simulation.
 * 
 * Some sources related to rigid body engine implementation:
 * https://www.toptal.com/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics
 * http://www.cs.cmu.edu/~baraff/sigcourse/notesd1.pdf
 * https://blog.winter.dev/2020/designing-a-physics-engine/
 */
class RigidBody {
    // State variables
    private _position: Vector3;
    private _rotation: Quaternion;

    // Derived quantities
    private _linearVelocity: Vector3;
    private _angularVelocity: Vector3;

    // Computed quantities 
    private _force: Vector3;
    private _torque: Vector3;
    private _impulseForce: Vector3;
    private _impulseTorque: Vector3;

    // Constant quantities
    private _shape: RbShape;
    private _friction: number;

    // Temporary results
    protected currPositionStep: Vector3;
    protected currRotationStep: Quaternion;

    /**
     * @param pos initial position of the the rigid body
     * @param rot initial rotation of the rigid body
     * @param shape rigid body shape
     * @param friction coefficient of friction of this rigid body
     */
    public constructor(pos: Vector3 = new Vector3(0, 0, 0), rot?: Quaternion,
        shape?: RbShape, friction?: number) {
        this._position = pos;
        this._rotation = rot ?? new Quaternion();
        this._shape = shape ?? new RbShapeSphere(this, 1, 1);
        this._friction = friction ?? 0.4;

        this._force = new Vector3();
        this._torque = new Vector3();
        this._impulseForce = new Vector3();
        this._impulseTorque = new Vector3();

        this._linearVelocity = new Vector3();
        this._angularVelocity = new Vector3();
    }

    /**
     * Updates position and rotation of this rigid body, using the 
     * current force & torque (both impulse & non-impulse) values.
     * 
     * @param dt time step
     */
    public updatePosition(dt: number) {
        const linearAcc = this.force.clone().divideScalar(this.shape.mass);
        const angularAcc = this.torque.clone().divideScalar(this.shape.momentOfInertia);

        const impulseLinearAcc = this.impulseForce.clone().divideScalar(this.shape.mass);
        const impulseAngularAcc = this.impulseTorque.clone().divideScalar(this.shape.momentOfInertia);

        this.linearVelocity
            .add(linearAcc.multiplyScalar(dt))
            .add(impulseLinearAcc) // Impulse ignores delta time
            .multiplyScalar(1.0 - this.friction);

        this.angularVelocity
            .add(angularAcc.multiplyScalar(dt))
            .add(impulseAngularAcc) // Impulse ignores delta time
            .multiplyScalar(1.0 - this.friction);

        const angVelStep = this.angularVelocity.clone().multiplyScalar(dt);
        const angVelStepLen = angVelStep.length();

        this.currPositionStep = this.linearVelocity.clone().multiplyScalar(dt);
        this.currRotationStep = new Quaternion().setFromAxisAngle(angVelStep.normalize(), angVelStepLen);

        this.position.add(this.currPositionStep);
        this.rotation.premultiply(this.currRotationStep);
    }

    /**
     * Clears both impulse & non-impulse force and torque vectors
     */
    public clearForceAndTorque(): void {
        this.force.set(0, 0, 0);
        this.torque.set(0, 0, 0);
        this.impulseForce.set(0, 0, 0);
        this.impulseTorque.set(0, 0, 0);
    }

    /**
     * Applies a given force to the rigid body.
     * The force is applied once in "force-per-seconds" units.
     * In other words, applying force of X per one second would
     * result in the same amount of force added as single impulse of magnitude X.
     * 
     * @param force force to add
     */
    public addForce(force: Vector3): void {
        this.force.add(force);
    }

    /**
     * Applies a given force to the rigid body at the desired point.
     * The force is applied once in "force-per-seconds" units.
     * In other words, applying force of X per one second would
     * result in the same amount of force added as single impulse of magnitude X.
     * 
     * @param force force to add
     * @param worldPosition location where the force should be applied
     */
    public addForceAtPosition(force: Vector3, worldPosition: Vector3) {
        this.addForce(force);
        this.torque.add(worldPosition.clone().sub(this.position).cross(force));
    }

    /**
     * Applies impulse to the rigid body.
     * Contrary to force, impulse is applied immediately, i.e.,
     * it uses sort of "force-per-frame" units. 
     * 
     * @param impulse impulse to apply
     */
    public addImpulse(impulse: Vector3): void {
        this.impulseForce.add(impulse);
    }

    /**
    * Applies a given impulse to the rigid body at the desired point.
    * Contrary to force, impulse is applied immediately, i.e.,
    * it uses sort of "force-per-frame" units. 
    * 
    * @param impulse impulse to apply
    * @param worldPosition location where the impulse should be applied
    */
    public addImpulseAtPosition(impulse: Vector3, worldPosition: Vector3) {
        this.addImpulse(impulse);
        this.impulseTorque.add(worldPosition.clone().sub(this.position).cross(impulse));
    }

    /**
     * Converts position in the local space of this rigid body
     * to world space.
     * 
     * @param pos local position to convert
     * @returns corresponding world space position
     */
    public localToWorldPos(pos: Vector3): Vector3 {
        return pos.clone().applyQuaternion(this.rotation).add(this.position);
    }

    /**
     * Convers position from world space to the corresponding one
     * in the local space of this rigid body.
     * 
     * @param pos world space position to convert
     * @returns corresponding local space position
     */
    public worldToLocalPos(pos: Vector3): Vector3 {
        const rotInv = this.rotation.clone().conjugate();
        return pos.clone().sub(this.position).applyQuaternion(rotInv);
    }

    /**
     * @returns Force to be applied during next simulation iteration.
     * Includes also force generated by impulses.
     */
    public getCurrentForce(): Vector3 {
        return this._force.clone().add(this._impulseForce).divideScalar(this.shape.mass);
    }

    /**
    * @returns Torque to be applied during the next simulation iteration.
    * Covers also torque generated by impulses.
    */
    public getCurrentTorque(): Vector3 {
        return this._torque.clone().add(this._impulseTorque).divideScalar(this.shape.mass);
    }

    /**
     * @returns position of this rigid body
     */
    public get position(): Vector3 {
        return this._position;
    }

    /**
     * Sets new position of this rigid body
     */
    public set position(value: Vector3) {
        // TODO compute currPositionStep 
        this._position = value;
    }

    /**
     * @returns rotation of this rigid body
     */
    public get rotation(): Quaternion {
        return this._rotation;
    }

    /**
     * Sets new rigid body rotation
     */
    public set rotation(value: Quaternion) {
        // TODO compute currRotationStep
        this._rotation = value;
    }

    /**
     * @returns current linear velocity
     */
    public get linearVelocity(): Vector3 {
        return this._linearVelocity;
    }

    /**
     * @returns current angular velocity
     */
    public get angularVelocity(): Vector3 {
        return this._angularVelocity;
    }

    /**
     * @returns rigid body shape
     */
    public get shape(): RbShape {
        return this._shape;
    }

    /**
     * Sets new rigid body shape
     */
    public set shape(value: RbShape) {
        this._shape = value;
    }

    /**
     * @returns friction coefficient
     */
    public get friction(): number {
        return this._friction;
    }

    /**
     * Sets new friction coefficient
     */
    public set friction(value: number) {
        this._friction = value;
    }

    /**
     * @returns current force to be applied
     */
    protected get force(): Vector3 {
        return this._force;
    }

    /**
     * Sets new force to be applied (overriding accumulated forces).
     * Use this setter only when you know what you are doing.
     * Otherwise, use addForce* functions.
     */
    protected set force(value: Vector3) {
        this._force = value;
    }

    /**
     * @returns current torque to be applied
     */
    protected get torque(): Vector3 {
        return this._torque;
    }

    /**
     * Sets new torque to be applied (overriding accumulated torque).
     * Use this setter only when you know what you are doing.
     * Otherwise, use addForce* functions.
     */
    protected set torque(value: Vector3) {
        this._torque = value;
    }

    /**
     * @returns current impulse-based force to be applied
     */
    protected get impulseForce(): Vector3 {
        return this._impulseForce;
    }

    /**
     * Sets new impulse-based force to be applied.
     * Use this setter only when you know what you are doing.
     * Otherwise, use addImpulse* functions.
     */
    protected set impulseForce(value: Vector3) {
        this._impulseForce = value;
    }

    /**
     * @returns current impulse-based torque to be applied
     */
    protected get impulseTorque(): Vector3 {
        return this._impulseTorque;
    }

    /**
     * Sets new impulse-based torque to be applied.
     * Use this setter only when you know what you are doing.
     * Otherwise, use addImpulse* functions.
     */
    protected set impulseTorque(value: Vector3) {
        this._impulseTorque = value;
    }
}

export default RigidBody;