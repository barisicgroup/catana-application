import { Signal } from "signals";
import { ArrowHelper, Box3, Box3Helper, Color, Vector3 } from "three";
import { Stage } from "../../catana";
import { Debug } from "../../globals";
import IUpdateable from "../utils/iupdateable";
import RbJoint from "./joints/rb-joint";
import RigidBody from "./rigidbody";

/**
 * Signals emitted by the Rigid Body simulator
 */
export interface RigidBodySimulatorSignals {
    /**
     * Emitted after every simulation step. Provided argument
     * corresponds to the total force in the system.
     */
    simulationStepExecuted: Signal
}

/**
 * Class managing the rigid body dynamics simulation
 */
class RigidBodySimulator implements IUpdateable {
    /**
     * Events emitted by the simulator
     */
    public readonly signals: RigidBodySimulatorSignals = {
        simulationStepExecuted: new Signal()
    }

    private _stage: Stage;

    /**
     * Time step of the rigid body simulator.
     * If set to value <= 0, the time step will match the rendering delta time.
     */
    private _timeStep: number;

    private _collResolutionForceMult: number;
    private _bodies: RigidBody[];
    private _joints: RbJoint[];
    private _isRunning: boolean;
    private _isRunningPaused: boolean;

    private _bodiesDebugObjects: {
        origin: Box3Helper,
        forceDir: ArrowHelper,
        torqueDir: ArrowHelper
    }[];

    private _jointsDebugObjects: {
        startEndConnection: ArrowHelper
    }[];

    /**
     * @param stage an instance of a Stage class
     * @param timeStep simulation time step, i.e., how large intervals are between each step.
     * If set to value > 0, the time step is not related to actual computational time but rather
     * describes precision of the computation.
     * @param collResForceMultiplier value determining how much to strengthen/weaken the collision resolution forces
     */
    public constructor(stage: Stage, timeStep: number = -1,
        collResForceMultiplier: number = 5) {
        this._stage = stage;
        this.timeStep = timeStep;
        this._collResolutionForceMult = collResForceMultiplier;
        this.clearData();
    }

    /**
     * If the simulator is running, this function executes a single simulation step
     * 
     * @param deltaTime time since last frame
     */
    public onUpdate(deltaTime: number): void {
        // This check might not be necessary but it is present to ensure
        // dependency on start/stop methods
        if (this._isRunning) {
            this.simulationStep(this.timeStep <= 0 ? deltaTime : this.timeStep);
        }
    }

    /**
     * @returns stage class instance
     */
    public get stage(): Stage {
        return this._stage;
    }

    /**
     * @returns simulation time step
     */
    public get timeStep(): number {
        return this._timeStep;
    }

    /**
     * Sets new simulation time step
     */
    public set timeStep(value: number) {
        this._timeStep = value;
    }

    /**
     * @returns multiplier of collision resolution forces
     */
    public get collisionResolutionForceMult(): number {
        return this._collResolutionForceMult;
    }

    /**
     * Sets new multiplier of collision resolution forces
     */
    public set collisionResolutionForceMult(value: number) {
        this._collResolutionForceMult = value;
    }

    /**
     * @returns list of rigid bodies considered by the simulation
     */
    public get rigidBodies(): RigidBody[] {
        return this._bodies;
    }

    /**
     * @returns list of joints considered by the simulation
     */
    public get joints(): RbJoint[] {
        return this._joints;
    }

    /**
     * @returns true if the simulator is currently running, false otherwise
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * Includes new rigid body in the simulation.
     * 
     * @param body rigid body to include
     */
    public addRigidBody(body: RigidBody): void {
        this._bodies.push(body);
    }

    /**
     * Sets rigid bodies to be included in the simulation.
     * If there were some already included, they will be replaced 
     * by the newly added ones.
     * 
     * @param bodies rigid bodies to include
     */
    public setRigidBodies(bodies: RigidBody[]): void {
        this._bodies = bodies;
    }

    /**
     * Removes rigid body from the list of bodies to be simulated
     * 
     * @param body rigid body to remove
     */
    public removeRigidBody(body: RigidBody): void {
        const idx = this._bodies.indexOf(body);
        if (idx >= 0) {
            this._bodies.splice(idx, 1);
        }
    }

    /**
     * Includes new joint in the simulation.
     * Note: expects that the rigid bodies at the ends of the joint
     * already are or will be included as well (using the appropriate method) in the simulator
     * or the behavior is undefined.
     * 
     * @param joint joint to add
     */
    public addJoint(joint: RbJoint): void {
        this._joints.push(joint);
    }

    /**
     * Sets joints to be included in the simulation (overwriting existing if any).
     * 
     * @param joints joints to add
     */
    public setJoints(joints: RbJoint[]): void {
        this._joints = joints;
    }

    /**
     * Removes joint from the simulator
     * 
     * @param joint joint to remove
     */
    public removeJoint(joint: RbJoint): void {
        const idx = this._joints.indexOf(joint);
        if (idx >= 0) {
            this._joints.splice(idx, 1);
        }
    }

    /**
     * Clears simulator data and resets its state
     */
    public clearData(): void {
        this._bodies = [];
        this._joints = [];
        this.stage.removeUpdateable(this);
        this._isRunning = false;
        this._isRunningPaused = false;

        if (this._bodiesDebugObjects) {
            for (let i = 0; i < this._bodiesDebugObjects.length; ++i) {
                this.stage.viewer.removeDebugObjects(
                    this._bodiesDebugObjects[i].origin,
                    this._bodiesDebugObjects[i].forceDir,
                    this._bodiesDebugObjects[i].torqueDir
                );
            }
        }
        this._bodiesDebugObjects = [];

        if (this._jointsDebugObjects) {
            for (let i = 0; i < this._jointsDebugObjects.length; ++i) {
                this.stage.viewer.removeDebugObjects(
                    this._jointsDebugObjects[i].startEndConnection
                );
            }
        }
        this._jointsDebugObjects = [];
    }

    /**
     * Starts the simulation
     * 
     * @param bodies bodies to be included.
     * If not set, bodies added via other simulator functions will be used.
     * Otherwise, already added bodies will be replaced with these.
     * @param joints joints to be included.
     * If not set, joints added via other simulator functions will be used.
     * Otherwise, already added joints will be replaced with these.
     */
    public start(bodies?: RigidBody[], joints?: RbJoint[]): void {
        if (!this._isRunning) {

            if (bodies) {
                this.setRigidBodies(bodies);
            }

            if (joints) {
                this.setJoints(joints);
            }

            if (!this._isRunningPaused) {
                this.stage.addUpdateable(this);
            }
            this._isRunning = true;
            this._isRunningPaused = false;
        }
    }

    /**
     * Stops the simulation and clears its data
     */
    public stop(): void {
        this.clearData();
    }

    /**
     * Continues the simulation
     */
    public continue(): void {
        this.start();
    }

    /**
     * Pauses the simulation, keeping all the data so it can continue later if needed.
     */
    public pause(): void {
        this._isRunning = false;
        this._isRunningPaused = true;
    }

    /**
     * Applies explosion effect (impulse) at the center of mass
     * of the simulated rigid bodies.
     * 
     * @param strength strength of the explosion
     */
    public applyExplosionAtCenterOfMass(strength: number): void {
        let massSum: number = 0;
        let pos: Vector3 = new Vector3(0, 0, 0);

        for (let i = 0; i < this.rigidBodies.length; ++i) {
            pos.add(this.rigidBodies[i].position);
            massSum += this.rigidBodies[i].shape.mass;
        }

        pos.divideScalar(massSum);

        for (let i = 0; i < this.rigidBodies.length; ++i) {
            this.rigidBodies[i].addImpulse(
                this.rigidBodies[i].position.clone()
                    .sub(pos)
                    .normalize()
                    .multiplyScalar(strength));
        }
    }

    /**
     * Renders debug objects
     */
    private renderDebugObjects(): void {
        // If no debug objects are created, create them and add them to stage
        if (this._bodiesDebugObjects.length === 0) {
            let tmp = new Vector3();
            for (let i = 0; i < this.rigidBodies.length; ++i) {
                const origBox = new Box3Helper(new Box3(), new Color(1, 1, 1));
                const fArrow = new ArrowHelper(tmp, tmp, 1, 0xff0000);
                const tArrow = new ArrowHelper(tmp, tmp, 1, 0xffff00);

                this._bodiesDebugObjects.push({
                    origin: origBox,
                    forceDir: fArrow,
                    torqueDir: tArrow
                });

                this.stage.viewer.addDebugObjects(origBox, fArrow, tArrow);
            }
        }

        if (this._jointsDebugObjects.length === 0) {
            let tmp = new Vector3();
            for (let i = 0; i < this.joints.length; ++i) {
                const startEndArrow = new ArrowHelper(tmp, tmp, 1, 0x74ff6d);

                this._jointsDebugObjects.push({
                    startEndConnection: startEndArrow
                });

                this.stage.viewer.addDebugObjects(startEndArrow);
            }
        }

        const arrowHeadSize = 3;

        // Update debug objects based on current status of the scene
        for (let i = 0; i < this._bodiesDebugObjects.length; ++i) {
            this._bodiesDebugObjects[i].forceDir.position.copy(this._bodies[i].position);
            this._bodiesDebugObjects[i].torqueDir.position.copy(this._bodies[i].position);

            const forceDir = this._bodies[i].getCurrentForce();
            const torqueDir = this._bodies[i].getCurrentTorque();
            const forceDirLen = forceDir.length();
            const torqueDirLen = torqueDir.length();

            const maxForceLen = Math.max(forceDirLen, torqueDirLen);
            const maxArrowLen = 30;
            const minArrowLen = 1;
            const boxSize = 1;

            this._bodiesDebugObjects[i].origin.box = new Box3().setFromCenterAndSize(this._bodies[i].position, new Vector3(boxSize, boxSize, boxSize));

            this._bodiesDebugObjects[i].forceDir.setLength(maxArrowLen * (forceDirLen / maxForceLen) + minArrowLen, arrowHeadSize, arrowHeadSize);
            this._bodiesDebugObjects[i].torqueDir.setLength(maxArrowLen * (torqueDirLen / maxForceLen) + minArrowLen, arrowHeadSize, arrowHeadSize);

            this._bodiesDebugObjects[i].forceDir.setDirection(forceDir.normalize());
            this._bodiesDebugObjects[i].torqueDir.setDirection(torqueDir.normalize());
        }

        for (let i = 0; i < this._jointsDebugObjects.length; ++i) {
            const wposStart = this._joints[i].startRigidBody.localToWorldPos(this._joints[i].startConnectionPoint);
            const wposEnd = this._joints[i].endRigidBody.localToWorldPos(this._joints[i].endConnectionPoint);

            const startEnd = wposEnd.clone().sub(wposStart);

            this._jointsDebugObjects[i].startEndConnection.position.copy(wposStart);
            this._jointsDebugObjects[i].startEndConnection.setLength(startEnd.length(), arrowHeadSize, arrowHeadSize);
            this._jointsDebugObjects[i].startEndConnection.setDirection(startEnd.normalize());

            if (this._joints[i].isBroken) {
                this._jointsDebugObjects[i].startEndConnection.setColor(0xCCCCCC);
            }
        }
    }

    /**
     * Performs a single simulation step
     * 
     * @param dt time step
     */
    private simulationStep(dt: number): void {
        // Apply joints forces
        for (let i = 0; i < this.joints.length; ++i) {
            this.joints[i].applyForces();
        }

        // Apply forces handling collision detection and response
        for (let i = 0; i < this.rigidBodies.length; ++i) {
            this.computeContactForces(this.rigidBodies[i], dt);
        }

        // Update positions of all bodies
        for (let i = 0; i < this.rigidBodies.length; ++i) {
            this.rigidBodies[i].updatePosition(dt);
        }

        // Render debug objects if desired
        if (Debug) {
            this.renderDebugObjects();
        }

        let totalForces: number = 0;

        // Compute total forces and clear computed quantities
        for (let i = 0; i < this.rigidBodies.length; ++i) {
            totalForces += this.rigidBodies[i].getCurrentForce().length();
            this.rigidBodies[i].clearForceAndTorque();
        }

        this.signals.simulationStepExecuted.dispatch(totalForces);
        this.stage.viewer.requestRender();
    }

    /**
     * Computes contact forces between the given rigid body and other rigid bodies
     * 
     * @param caller calling rigid body
     * @param dt time step
     */
    private computeContactForces(caller: RigidBody, dt: number): void {
        for (let i = 0; i < this.rigidBodies.length; ++i) {
            if (this.rigidBodies[i] !== caller) {
                const collContact = caller.shape.checkCollision(this.rigidBodies[i].shape);
                if (collContact) {
                    caller.addForceAtPosition(
                        collContact.normal.clone().multiplyScalar(collContact.depth * this.collisionResolutionForceMult),
                        collContact.srcPointInColl
                    );
                }
            }
        }
    }
}

export default RigidBodySimulator;