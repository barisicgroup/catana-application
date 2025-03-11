import { Vector3 } from "three";

/**
* Hermit spline / Catmull–Rom spline to interpolate given set of points
* @remark If you want to interpolate structural data, go for (Cg)Spline classes as they work better.
*/
class HermitSpline {
    private resultingPoints: Vector3[];
    private resultingNormals: Vector3[];
    private resultingTangents: Vector3[];

    /**
    * Creates new spline instance, performing the interpolation immediately when the class is constructed.
    * 
    * @param pointsToInterpolate points to be interpolated
    * @param interpolationSubdivisions how many additional interpolated points will be added to each line segment
    */
    constructor(pointsToInterpolate: Vector3[], interpolationSubdivisions: number) {
        this.interpolatePoints(pointsToInterpolate, interpolationSubdivisions);
    }

    /**
     * @returns interpolated/resulting points
     */
    get points(): Vector3[] {
        return this.resultingPoints;
    }

    /**
     * @returns interpolated/resulting normals
     */
    get normals(): Vector3[] {
        return this.resultingNormals;
    }

    /**
     * @returns interpolated/resulting tangents
     */
    get tangents(): Vector3[] {
        return this.resultingTangents;
    }

    /**
     * Interpolates given set of points
     * 
     * @param pointsToInterpolate points to be interpolated
     * @param interpolationSubdivisions number of subdivisions
     */
    private interpolatePoints(pointsToInterpolate: Vector3[], interpolationSubdivisions: number): void {
        this.resultingPoints = [];
        this.resultingNormals = [];
        this.resultingTangents = [];

        const pointsPerSegment = interpolationSubdivisions + 2;

        for (let i = 0; i < pointsToInterpolate.length - 1; ++i) {
            const p0 = pointsToInterpolate[i];
            const p1 = pointsToInterpolate[i + 1];

            const t0 = i == 0 ?
                this.getEndpointTangent(p0, p1) :
                this.getInteriorTangent(pointsToInterpolate[i - 1], p1);
            const t1 = i == pointsToInterpolate.length - 2 ?
                this.getEndpointTangent(p0, p1) :
                this.getInteriorTangent(p0, pointsToInterpolate[i + 2]);

            for (let j = 0; j < pointsPerSegment; ++j) {
                const t = j / (pointsPerSegment - 1);

                this.resultingPoints.push(this.interpolatePositionCubic(p0, t0, p1, t1, t));

                const tangent = this.interpolateTangentCubic(p0, t0, p1, t1, t).normalize();

                this.resultingTangents.push(tangent);
                this.resultingNormals.push(this.getNormalForTangent(tangent));
            }
        }
    }

    /**
     * Performs cubic interpolation of given positions
     * 
     * @param p0 first point
     * @param t0 tangent for the first point
     * @param p1 second point
     * @param t1 tangent for the second point
     * @param t interpolation parameter
     * @returns interpolated position
     */
    private interpolatePositionCubic(p0: Vector3, t0: Vector3, p1: Vector3, t1: Vector3, t: number): Vector3 {
        const t2 = t * t;
        const t3 = t2 * t;

        return p0.clone().multiplyScalar(2 * t3 - 3 * t2 + 1).add(
            t0.clone().multiplyScalar(t3 - 2 * t2 + t).add(
                p1.clone().multiplyScalar(-2 * t3 + 3 * t2)).add(
                    t1.clone().multiplyScalar(t3 - t2)));
    }

    /**
     * Performs cubic interpolation of the given tangents.
     * First derivative of the interpolatePositionCubic function.
     * 
     * @param p0 first point
     * @param t0 tangent for the first point
     * @param p1 second point
     * @param t1 tangent for the second point
     * @param t interpolation parameter
     * @returns interpolated tangent
     */
    private interpolateTangentCubic(p0: Vector3, t0: Vector3, p1: Vector3, t1: Vector3, t: number): Vector3 {
        const t2 = t * t;

        return p0.clone().multiplyScalar(6 * t2 - 6 * t).add(
            t0.clone().multiplyScalar(3 * t2 - 4 * t + 1).add(
                p1.clone().multiplyScalar(6 * t - 6 * t2)).add(
                    t1.clone().multiplyScalar(3 * t2 - 2 * t)));
    }

    /**
     * Returns normal vector for the provided tangent
     * 
     * @param tang tangent
     * @returns vector perpendicular to the tangent
     */
    private getNormalForTangent(tang: Vector3): Vector3 {
        if (Math.abs(tang.x) > 0.0) {
            return new Vector3((-tang.y - tang.z) / tang.x, 1, 1).normalize();
        }
        else if (Math.abs(tang.y) > 0.0) {
            return new Vector3(1, (-tang.x - tang.z) / tang.y, 1).normalize();
        }
        return new Vector3(1, 1, (-tang.x - tang.y) / tang.z).normalize();
    }

    /**
     * Returns tangent vector of a line between two points
     * 
     * @param prevPoint first point of the spline
     * @param nextPoint second point of the spline
     * @returns tangent vector
     */
    private getInteriorTangent(prevPoint: Vector3, nextPoint: Vector3): Vector3 {
        return nextPoint.clone().sub(prevPoint).multiplyScalar(0.5);
    }

    /**
     * Returns tangent vector for spline end point
     * 
     * @param pk first point
     * @param pkPlusOne following point
     * @returns tangent vector
     */
    private getEndpointTangent(pk: Vector3, pkPlusOne: Vector3): Vector3 {
        return pkPlusOne.clone().sub(pk);
    }
}

export default HermitSpline;