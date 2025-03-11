import { CgMonomerProxy, CgStructureComponent, Component, Filter, StructureCluster, StructureComponent } from "../../../catana";
import BitArray_Legacy from "../../../utils/bitarray";
import CgNucleotideProxy from "../../data_model/proxy/cg-nucleotide-proxy";
import RbJoint from "../joints/rb-joint";
import RbSpringJoint from "../joints/rb-spring-joint";

/**
 * Class containing a collection of algorithms related to the creation of (rigid body) structure clusters
 */
class ClusterAlgorithms {
    /**
     * Propagates transformations of each component down to its elements,
     * i.e., the component has an identity transformation matrix after this operation
     * while it seemingly did not move in space.
     * 
     * @param components array of components to influence
     */
    public static prepareComponents(components: Component[]) {
        for (let i = 0; i < components.length; ++i) {
            const c = components[i];
            if (c instanceof CgStructureComponent ||
                c instanceof StructureComponent) {
                c.propagateTransfToElems();
            }
        }
    }

    /**
     * Returns inter-cluster (D)(R)NA backbone joints
     * 
     * @param clusters clusters to use for the computation
     * @param targetBondLength desired length of the backbone joints
     * @param springConstant constant used for spring joints
     * @returns array of joints between clusters
     */
    public static computeInterclusterJoints(clusters: StructureCluster[], targetBondLength: number = 3.32, springConstant: number = 10): RbJoint[] {
        const joints: RbJoint[] = [];

        // Add joints correponding to inter-cluster (D)(R)NA backbone connections
        for (let i = 0; i < clusters.length; ++i) {
            const thisElems = clusters[i].elements;
            for (let j = i + 1; j < clusters.length; ++j) {
                const otherElems = clusters[j].elements;
                for (let k = 0; k < thisElems.length; ++k) {
                    const thisEl = thisElems[k];
                    if (thisEl instanceof CgNucleotideProxy) {
                        for (let l = 0; l < otherElems.length; ++l) {
                            const otherEl = otherElems[l];
                            if (otherEl instanceof CgNucleotideProxy) {
                                if (thisEl.parentStrand === otherEl.parentStrand &&
                                    (Math.abs(thisEl.index - otherEl.index) === 1 ||
                                        (thisEl.parentStrand.isCircular && (
                                            thisEl.isFivePrime() && otherEl.isThreePrime() || (thisEl.isThreePrime() && otherEl.isFivePrime())
                                        ))
                                    )) {
                                    joints.push(
                                        new RbSpringJoint(
                                            clusters[i],
                                            clusters[i].worldToLocalPos(thisEl.position),
                                            clusters[j],
                                            clusters[j].worldToLocalPos(otherEl.position),
                                            springConstant,
                                            targetBondLength
                                        )
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        return joints;
    }

    /**
     * Creates structure clusters according to the provided filter strings.
     * 
     * @param components components to include in the computation
     * @param filters array of filter strings where each filter will result in one cluster
     */
    public static createFilterClusters(components: Component[], filters: string[]): StructureCluster[] {
        const clusters: StructureCluster[] = [];
        const allMonomers: CgMonomerProxy[] = this.getAllCgMonomers(components);
        // Bit array is used to make sure that each monomer is at most in one cluster
        const bitArray: BitArray_Legacy = new BitArray_Legacy(allMonomers.length);

        for (let i = 0; i < filters.length; ++i) {
            const thisMonomers: CgMonomerProxy[] = [];
            const filterString = filters[i];
            const filt = new Filter(filterString);

            for (let j = 0; j < allMonomers.length; ++j) {
                if (!bitArray.isSet(j)) {
                    if (filt && filt.test) {
                        const mt = filt.cgMonomerTest;
                        if (mt && mt(allMonomers[j])) {
                            thisMonomers.push(allMonomers[j]);
                            bitArray.set(j);
                        }
                    }
                }
            }

            if (thisMonomers.length > 0) {
                clusters.push(new StructureCluster(thisMonomers));
            }
        }

        return clusters;
    }

    /**
     * Creates structure clusters using the DBSCAN algorithm.
     * Based on "DBSCAN Revisited, Revisited: Why and How You Should (Still) Use DBSCAN" (https://doi.org/10.1145/3068335)
     * 
     * @param components components to include in the computation
     * @param neighbourRadius neighbour radius (DBSCAN parameter)
     * @param minPts minimum number of points needed for a valid cluster (DBSCAN parameter)
     * @returns array of structure clusters
     */
    public static createDbscanClusters(components: Component[], neighbourRadius: number, minPts: number): StructureCluster[] {
        const allMonomers: CgMonomerProxy[] = this.getAllCgMonomers(components);
        const neighbRadSq = neighbourRadius * neighbourRadius;
        const noiseClusterId = -1;
        let monomerToClusterId = new Map<CgMonomerProxy, number>();
        let clustersCount = 0;

        // DBSCAN implementation
        for (let i = 0; i < allMonomers.length; ++i) {
            const mon = allMonomers[i];

            if (monomerToClusterId.has(mon)) {
                continue;
            }

            let neighbours = ClusterAlgorithms.getMonomerNeighbours(allMonomers, mon, neighbRadSq);

            if (neighbours.length < minPts) {
                monomerToClusterId.set(mon, noiseClusterId);
                continue;
            }

            const clusterLabel = clustersCount++;
            monomerToClusterId.set(mon, clusterLabel);

            neighbours.splice(neighbours.indexOf(mon), 1);
            const seedSet = neighbours.slice();

            // Note: size of the seed set may increase during the loop
            for (let j = 0; j < seedSet.length; ++j) {
                const q = seedSet[j];
                const lbl = monomerToClusterId.get(q);

                if (lbl !== undefined && lbl !== noiseClusterId) {
                    continue;
                }

                neighbours = ClusterAlgorithms.getMonomerNeighbours(allMonomers, q, neighbRadSq);
                monomerToClusterId.set(q, clusterLabel);

                if (neighbours.length >= minPts) {
                    seedSet.push(...neighbours);
                }
            }
        }

        const clusters: StructureCluster[] = [];

        // Create structure clusters based on DBSCAN outcomes
        for (let i = 0; i < clustersCount; ++i) {
            const thisClusterMonomers: CgMonomerProxy[] = [];

            for (let [mon, cid] of monomerToClusterId) {
                if (cid === i) {
                    thisClusterMonomers.push(mon);
                }
            }

            clusters.push(new StructureCluster(thisClusterMonomers));
        }

        return clusters;
    }

    /**
     * Returns squared distance from one monomer to another
     * 
     * @param m1 first monomer
     * @param m2 second monomer
     * @returns squared distance between two monomers
     */
    private static getMonomerDistanceSq(m1: CgMonomerProxy, m2: CgMonomerProxy): number {
        return m1.position.distanceToSquared(m2.position);
    }

    /**
     * Returns neighbours of the given monomer within the given (squared) distance.
     * The result also includes the source/calling monomer.
     * 
     * @param allMonomers monomers to consider
     * @param srcMonomer calling monomer
     * @param neighbRadSq given squared radius
     */
    private static getMonomerNeighbours(allMonomers: CgMonomerProxy[], srcMonomer: CgMonomerProxy, neighbRadSq: number): CgMonomerProxy[] {
        const res: CgMonomerProxy[] = [];

        for (let i = 0; i < allMonomers.length; ++i) {
            if (ClusterAlgorithms.getMonomerDistanceSq(srcMonomer, allMonomers[i]) <= neighbRadSq) {
                res.push(allMonomers[i]);
            }
        }

        return res;
    }

    private static getAllCgMonomers(components: Component[]): CgMonomerProxy[] {
        let allMonomers: CgMonomerProxy[] = [];

        // NOTE Not very good approach performance-wise

        for (let i = 0; i < components.length; ++i) {
            let comp = components[i];
            if (comp instanceof CgStructureComponent) {
                comp.cgStructure.forEachMonomer(mon => {
                    allMonomers.push(mon.clone());
                })
            }
        }

        return allMonomers;
    }
}

export default ClusterAlgorithms;