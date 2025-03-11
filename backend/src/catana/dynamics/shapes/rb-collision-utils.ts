import { Vector3 } from "three";
import RbCollisionContact from "./rb-collision-contact";
import RbCompoundShape from "./rb-compound-shape";
import RbShape from "./rb-shape";
import { RbShapeSphere } from "./rb-shape-sphere";

/**
 * Class providing collision detection utilities
 */
class RbCollisionUtils {
    /**
     * Checks collision between two rigid body shapes
     * 
     * @param rbCaller calling shape
     * @param rbOther other shape
     * @returns collision contact information or undefined if the shapes do not collide or their collision is not supported
     */
    public static checkAnyAnyCollision(rbCaller: RbShape, rbOther: RbShape): RbCollisionContact | undefined {
        if (rbCaller instanceof RbShapeSphere) {
            if (rbOther instanceof RbShapeSphere) {
                return RbCollisionUtils.checkSphereSphereCollision(rbCaller, rbOther);
            } else if (rbOther instanceof RbCompoundShape) {
                return RbCollisionUtils.checkAnyCompoundCollision(rbCaller, rbOther);
            }
        } else if (rbCaller instanceof RbCompoundShape) {
            return RbCollisionUtils.checkCompoundAnyCollision(rbCaller, rbOther);
        }

        return undefined;
    }

    /**
     * Checks collision between two spherical rigid body shapes
     * 
     * @param rbCaller calling sphere shape
     * @param rbOther other sphere shape
     * @returns collision contact information or undefined if no collision was detected
     */
    public static checkSphereSphereCollision(rbCaller: RbShapeSphere, rbOther: RbShapeSphere): RbCollisionContact | undefined {
        const b1 = rbCaller.parentRigidBody;
        const b2 = rbOther.parentRigidBody;

        const c1 = rbCaller.worldPosition;
        const c2 = rbOther.worldPosition;

        const r1 = rbCaller.radius;
        const r2 = rbOther.radius;

        const c1ToC2 = c2.clone().sub(c1);

        if (c1ToC2.lengthSq() <= Math.pow(r1 + r2, 2)) {
            const callPtInOther = c1.clone().add(c1ToC2.clone().normalize().multiplyScalar(r1));
            const otherPtInCall = c2.clone().add(c1ToC2.clone().negate().normalize().multiplyScalar(r2));

            return new RbCollisionContact(b1, b2, callPtInOther, otherPtInCall);
        }

        return undefined;
    }

    /**
    * Checks collision between compound rigid body shape and any other shape
    * 
    * @param rbCaller calling compound shape
    * @param rbOther other shape
    * @returns collision contact information or undefined if no collision was detected
    */
    public static checkCompoundAnyCollision(rbCaller: RbCompoundShape, rbOther: RbShape): RbCollisionContact | undefined {
        let contacts: RbCollisionContact[] = [];

        for (let i = 0; i < rbCaller.shapes.length; ++i) {
            const collCont = rbCaller.shapes[i].checkCollision(rbOther);
            if (collCont) {
                contacts.push(collCont);
            }
        }

        if (contacts.length === 0) {
            return undefined;
        }

        // Current solution simply computes the 
        // centroid of collision points and assumes
        // this is the "deepest" impact point

        let srcPointInColl = new Vector3();
        let collPointInSrc = new Vector3();

        for (let i = 0; i < contacts.length; ++i) {
            srcPointInColl.add(contacts[i].srcPointInColl);
            collPointInSrc.add(contacts[i].collPointInSrc);
        }

        srcPointInColl.divideScalar(contacts.length);
        collPointInSrc.divideScalar(contacts.length);

        return new RbCollisionContact(rbCaller.parentRigidBody,
            rbOther.parentRigidBody,
            srcPointInColl, collPointInSrc);
    }

    /**
    * Checks collision between any rigid body shape and compound rigid body shape
    * 
    * @param rbCaller calling shape
    * @param rbOther other compound shape
    * @returns collision contact information or undefined if no collision was detected
    */
    public static checkAnyCompoundCollision(rbCaller: RbShape, rbOther: RbCompoundShape): RbCollisionContact | undefined {
        const coll = RbCollisionUtils.checkCompoundAnyCollision(rbOther, rbCaller);

        // Invert the points to make the collision from perspective of the caller

        if (!coll) {
            return undefined;
        }

        return new RbCollisionContact(
            rbCaller.parentRigidBody,
            rbOther.parentRigidBody,
            coll.collPointInSrc,
            coll.srcPointInColl
        );
    }
}

export default RbCollisionUtils;