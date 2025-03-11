import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";
import AtomProxy from "../../proxy/atom-proxy";
import { NucleobaseType, isPurineNucleobase, getComplementaryBase, monomerTypeToOneLetterCharCode } from "../data_model/types_declarations/monomer-types";
import ResidueProxy from "../../proxy/residue-proxy";
import { permutations } from "../utils/catana-utils";
import NucleicAcidStructuresProvider, { ReferenceStructureData } from "./structure-providers/nucleic-acid-structures-provider";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import { NucleicAcidType } from "../data_model/types_declarations/polymer-types";
import CgStructure from "../data_model/cg-structure";
import { Log } from "../../globals";

/**
 * Multiplier to use when converting from oxDNA units to Angstroms
 */
const oxDnaUnitsToAngst = 8.518;

/**
 * Computes the normal of the base plane (follows the computation described in the UNF format documentation).
 * The normal is similar to the Z-axis as defined by the standard reference frame for nucleotides (e.g., in 3DNA).
 * 
 * @param nbType type of nucleobase
 * @param rp residue proxy referencing the nucleotide residue
 * @returns base normal vector
 * @throws Error if atoms necessary for the computation were not found
 */
export function computeBaseNormal(nbType: NucleobaseType, rp: ResidueProxy): Vector3 {
    const o4pAtomName: string = "O4'";
    const ringAtomNames: string[] = ["C2", "C4", "C5", "C6", "N1", "N3"];

    const o4pAtomIdx: number | undefined = rp.getAtomIndexByName(o4pAtomName);
    let ringAtomIndices: number[] = [];

    if (o4pAtomIdx === undefined) {
        throw new Error("Atom not found: " + o4pAtomName);
    }

    for (let i = 0; i < ringAtomNames.length; ++i) {
        const tmp = rp.getAtomIndexByName(ringAtomNames[i]);
        if (tmp === undefined) {
            throw new Error("Atom not found: " + o4pAtomName);
        } else {
            ringAtomIndices.push(tmp);
        }
    }

    const o4pAtom: AtomProxy = rp.structure.getAtomProxy(o4pAtomIdx);
    let ringAtoms: AtomProxy[] = [];

    for (let i = 0; i < ringAtomIndices.length; ++i) {
        ringAtoms.push(rp.structure.getAtomProxy(ringAtomIndices[i]));
    }

    const centerOfMass: Vector3 = rp.getAtomCentroid();
    const parallelDir: Vector3 = centerOfMass.sub(o4pAtom.positionToVector3());
    const baseNormal: Vector3 = new Vector3(0, 0, 0);

    const ringPermutations = permutations(ringAtoms, 3);

    ringPermutations.forEach(perm => {
        const v1: Vector3 = perm[0].positionToVector3().sub(perm[1].positionToVector3()).normalize();
        const v2: Vector3 = perm[0].positionToVector3().sub(perm[2].positionToVector3()).normalize();

        const tmp: Vector3 = v1.clone().cross(v2).normalize();
        if (tmp.dot(parallelDir) < 0) {
            tmp.negate();
        }
        baseNormal.add(tmp);
    });

    return baseNormal.normalize();
}

/**
 * Computes the direction of the nucleotide's hydrogen face (follows the computation described in the UNF format documentation).
 * This direction is similar to the Y-axis as defined by the standard reference frame for nucleotides (e.g., in 3DNA).
 * 
 * @param nbType nucleobase type
 * @param rp residue proxy referencing the nucleotide residue
 * @returns hydrogen face direction vector
 * @throws Error if atoms necessary for the computation were not found
 */
export function computeBaseHydrogenFaceDir(nbType: NucleobaseType, rp: ResidueProxy): Vector3 {
    let atNamePairs: [string, string][];

    if (isPurineNucleobase(nbType)) {
        atNamePairs = [["N1", "C4"], ["C2", "N3"], ["C6", "C5"]]
    } else {
        atNamePairs = [["N3", "C6"], ["C2", "N1"], ["C4", "C5"]]
    }

    let resDir: Vector3 = new Vector3(0, 0, 0);

    atNamePairs.forEach(pair => {
        let v1Index: number | undefined = rp.getAtomIndexByName(pair[0]);
        let v2Index: number | undefined = rp.getAtomIndexByName(pair[1]);

        if (v1Index === undefined || v2Index === undefined) {
            throw new Error("Some of these atoms not found: " + pair[0] + "," + pair[1]);
        }

        let v1Atom: AtomProxy = rp.structure.getAtomProxy(v1Index);
        let v2Atom: AtomProxy = rp.structure.getAtomProxy(v2Index);

        resDir.add(v1Atom.positionToVector3().sub(v2Atom.positionToVector3()));
    });

    return resDir.normalize();
}

/**
 * Computes the base's short axis (follows the computation described in the UNF format documentation).
 * This direction is similar to the X-axis as defined by the standard reference frame for nucleotides (e.g., in 3DNA).
 * 
 * @param nbType nucleobase type
 * @param rp residue proxy referencing the nucleotide residue
 * @returns base short axis vector
 * @throws Error if atoms necessary for the computation were not found
 */
export function computeBaseShortAxis(nbType: NucleobaseType, rp: ResidueProxy): Vector3 {
    return computeBaseHydrogenFaceDir(nbType, rp).cross(computeBaseNormal(nbType, rp)).normalize();
}

/**
 * Since different nucleobases have differently positioned backbone with respect to the 
 * center of the nucleobase, this function returns a matrix for transformation from
 * the coordinate system of one nucleobase to another with a goal to align
 * their origin-C1' vectors.
 * 
 * @param sourceRefStructure reference structure of the current nucleotide
 * @param targetRefStructure reference structure of the nucleotide to which to transform,
 * @param srcBasis if provided, determines the base/space in which transformation happens
 * @returns quaternion describing transformation from the source to target structure
 */
export function getNucleobaseChangeTransformation(sourceRefStructure: ReferenceStructureData,
    targetRefStructure: ReferenceStructureData,
    srcBasis?: Matrix4): Quaternion {
    const soc1 = sourceRefStructure.originToC1.clone().normalize();
    const toc1 = targetRefStructure.originToC1.clone().normalize();

    if (srcBasis) {
        soc1.applyMatrix4(srcBasis).normalize();
        toc1.applyMatrix4(srcBasis).normalize();
    }

    return new Quaternion().setFromUnitVectors(soc1, toc1);
}

/**
 * This function automatically detects & assigns potential base-pairs.
 * The detection currently considers only valid canonical Watson-Crick pairs.
 * 
 * @param cgStructure structure inside which the base-detection should happen
 * @param replaceExisting if set to true, existing base-pairs will be influenced (i.e., they might get removed)
 */
export function autoDetectBasePairs(cgStructure: CgStructure, replaceExisting: boolean = false): void {
    // If we allow for replacing of existing base-pairs, all of them are removed first 
    // before initiating the "regular" procedure
    if (replaceExisting) {
        cgStructure.forEachNaStrand(str => str.forEachNucleotide(nt => nt.pairId = -1));
    }

    // Max & min distance between nucleobase centers to be 
    // considered as an "base-pair adept". Empirically determined numbers.
    const maxBaseDistSq = 8.5 * 8.5;
    const minBaseDistSq = 2.0 * 2.0;

    // Max deviation between hydrogen face directions. Empirically determined.
    const maxAngleDiff = 15.0 * MathUtils.DEG2RAD;

    cgStructure.forEachNaStrand(strand1 => {
        strand1.forEachNucleotide(nt1 => {
            if (nt1.pairId < 0) {
                const bn = nt1.baseNormal;
                const complType = monomerTypeToOneLetterCharCode(
                    getComplementaryBase(nt1.nucleobaseType, strand1.naType));
                const hdir1 = nt1.hydrogenFaceDir.clone().projectOnPlane(bn);
                const hdir1neg = hdir1.clone().negate();
                // In case there would be more alternatives, select the one with the best (lowest) "score",
                // where score is simply sum of distance and angle
                let bestScore = Number.MAX_SAFE_INTEGER;

                cgStructure.forEachNaStrand(strand2 => {
                    strand2.forEachNucleotide(nt2 => {
                        if (nt2.nucleobaseTypeCharCode === complType && nt2.pairId < 0) {
                            const baseDistSq = nt1.nucleobaseCenter.distanceToSquared(nt2.nucleobaseCenter);
                            if (baseDistSq <= maxBaseDistSq && baseDistSq >= minBaseDistSq) {
                                const hdir2 = nt2.hydrogenFaceDir.projectOnPlane(bn);
                                const angle = hdir1neg.angleTo(hdir2);
                                const score = baseDistSq + angle;
                                if (hdir1.dot(hdir2) < 0 && angle <= maxAngleDiff && score <= bestScore) {
                                    nt1.pairId = nt2.globalId;
                                    nt2.pairId = nt1.globalId;
                                    bestScore = score;
                                }
                            }
                        }
                    });
                });
            }
        });
    });
}

/**
* Computes local helical axis at the given nucleotide.
* The final axis may need to be inverted.
* 
* @param srcNt reference nucleotide determining location where the axis should be computed
* @returns local helical axis at the position of the given nucleotide
*/
export function computeHelicalAxis(srcNt: CgNucleotideProxy): Vector3 {
    // TODO Currently rather simplistic, can be made more robust
    const complNt = srcNt.pairedNucleotide;

    if (complNt) {
        const shortAxis = srcNt.baseShortAxis.clone().add(complNt.baseShortAxis).normalize();
        const hydrDir = srcNt.hydrogenFaceDir;
        return shortAxis.cross(hydrDir).normalize();
    }

    return srcNt.baseNormal.clone();
}

/**
 * Returns boolean determining whether the provided structure is stored in oxDNA geometry or not.
 * The information is deduced from the properties of the (D)(R)NA geometry. 
 * Therefore, the function is not guaranteed to be always accurate.
 * 
 * @remark 
 * While oxDNA uses similar (D)(R)NA positional parameters as Catana, the interpretation
 * of these parameters is slightly different -- oxDNA uses approximations
 * for the location of nucleobase and backbone centers, as it internally works with center of mass,
 * while Catana works with separate nb and bb centers both internally and externally, 
 * using precise values for these properties, deduced from reference PDB files.
 * 
 * @param cgStructure structure to check
 * @returns true if the structure seems to be stored in oxDNA geometry
 */
export function isStructureInOxDnaGeometry(cgStructure: CgStructure): boolean {
    // If we find a strand with most of its nucleotides appearing to be coming from
    // oxDNA-generated geometry, we assume the whole structure is in this geometry. 
    return cgStructure.findNaStrand(str => {
        // The decision if the given strand is stored in oxDNA geometry is performed
        // based on distance between nucleobase and backbone centers, since the constants
        // employed by oxView offset these centers from the center of mass along a 
        // common axis, resulting in distance larger than from the reference structures.
        const thresholdDist = Math.pow(oxDnaUnitsToAngst * 0.7, 2);
        let oxNucl: number = 0;

        str.forEachNucleotide(nucl => {
            if (nucl.nucleobaseCenter.distanceToSquared(nucl.backboneCenter) >= thresholdDist) {
                ++oxNucl;
            }
        });

        return oxNucl >= str.length / 2;
    }) !== undefined;
}

/**
 * Transforms this structure to oxDNA-like geometry.
 * You can check for structure's geometry using {@link isStructureInOxDnaGeometry}.
 * 
 * @remark This method may result in positional inaccuracies and is expected to be called only once for the given structure. 
 * 
 * @param cgStructure structure to be transformed
 */
export function transformStructureToOxDnaGeometry(cgStructure: CgStructure): void {
    cgStructure.forEachNaStrand(transformStrandToOxDnaGeometry);
}

function transformStrandToOxDnaGeometry(strand: CgNucleicAcidStrand): void {
    const naMap = NucleicAcidStructuresProvider.nucleicAcidStructures.get(strand.naType)!;

    strand.forEachNucleotide(nt => transformNucleotideToOxDnaGeometry(nt, naMap, strand.naType));
}

function transformNucleotideToOxDnaGeometry(nucl: CgNucleotideProxy, naMap: Map<NucleobaseType, ReferenceStructureData>, naType: NucleicAcidType): void {
    const pair = nucl.pairedNucleotide;

    if (pair === null || (pair !== null && nucl.parentStrand.globalId > pair.parentStrand.globalId)) {
        const refStruc = naMap.get(nucl.nucleobaseType)!;
        const pairRefStruc = pair ? naMap.get(pair.nucleobaseType)! : undefined;

        let basis = new Matrix4().makeBasis(
            nucl.baseShortAxis,
            nucl.hydrogenFaceDir,
            nucl.baseNormal);

        // Catana's geometry uses helical twist parameter to define (nucleotide origin)-(C1' atom) vectors.
        // However, oxDNA defines hydrogen faces direction with the same parameter
        // so we must perform a transformation between these interpretations.
        const desiredHydrFaceDir = refStruc.originToC1.clone().applyMatrix4(basis).negate().normalize();
        const vectorsTransf = new Quaternion().setFromUnitVectors(nucl.hydrogenFaceDir, desiredHydrFaceDir);

        nucl.hydrogenFaceDir = nucl.hydrogenFaceDir.applyQuaternion(vectorsTransf);
        nucl.baseNormal = nucl.baseNormal.applyQuaternion(vectorsTransf);
        transformNucleotideCentroidsToOxDna(nucl, naType, refStruc);

        if (pair) {
            pair.hydrogenFaceDir = pair.hydrogenFaceDir.applyQuaternion(vectorsTransf);
            pair.baseNormal = pair.baseNormal.applyQuaternion(vectorsTransf);
            transformNucleotideCentroidsToOxDna(pair, naType, pairRefStruc!);
        }
    }
}

function transformNucleotideCentroidsToOxDna(nucl: CgNucleotideProxy, naType: NucleicAcidType, refStruc: ReferenceStructureData): void {
    const basis = new Matrix4().makeBasis(
        nucl.baseShortAxis,
        nucl.hydrogenFaceDir,
        nucl.baseNormal);

    // All vectors are projected onto the nucleobase plane as oxDNA seems to use same plane for nb/bb locations
    const nbToCom = (refStruc.originToCenterOfMass.clone().sub(refStruc.originToBaseCenter)).projectOnPlane(new Vector3(0, 0, 1)).projectOnPlane(new Vector3(1, 0, 0)).applyMatrix4(basis);
    const com = nucl.nucleobaseCenter.clone().add(nbToCom);

    if (naType === NucleicAcidType.DNA) {
        nucl.backboneCenter = com.clone().sub(
            nucl.hydrogenFaceDir.multiplyScalar(0.34 * oxDnaUnitsToAngst).add(
                nucl.baseShortAxis.multiplyScalar(-0.3408 * oxDnaUnitsToAngst) // TODO HOTFIX due to the oxView having the baseNormal inverted
            )
        );
    } else {
        nucl.backboneCenter = com.clone().sub(
            nucl.hydrogenFaceDir.multiplyScalar(0.4 * oxDnaUnitsToAngst).sub(
                nucl.baseNormal.multiplyScalar(0.2 * oxDnaUnitsToAngst)
            )
        );
    }

    nucl.nucleobaseCenter = com.clone().add(nucl.hydrogenFaceDir.multiplyScalar(0.4 * oxDnaUnitsToAngst));
    nucl.baseNormal = nucl.baseNormal.negate(); // TODO HOTFIX due to the oxView having the baseNormal inverted
}

/**
 * Transforms this structure from oxDNA-like geometry to Catana geometry.
 * You can check for structure's geometry using {@link isStructureInOxDnaGeometry}.
 * 
 * @remark This method may result in positional inaccuracies and is expected to be called only once for the given structure. 
 * 
 * @param cgStructure structure to be transformed
 */
export function transformStructureFromOxDnaGeometry(cgStructure: CgStructure): void {
    Log.info("Converting from oxDNA geometry and detecting base-pairs ...");

    // We will need base-pair information for the transformation procedure
    cgStructure.generateBasePairs();

    cgStructure.forEachNaStrand(transformStrandFromOxDnaGeometry);
}

function transformStrandFromOxDnaGeometry(strand: CgNucleicAcidStrand): void {
    const naMap = NucleicAcidStructuresProvider.nucleicAcidStructures.get(strand.naType)!;

    strand.forEachNucleotide(nt => transformNucleotideFromOxDnaGeometry(nt, naMap, strand.naType));
}

/**
 * Basically inverse operation to {@link transformNucleotideToOxDnaGeometry} 
 */
function transformNucleotideFromOxDnaGeometry(nucl: CgNucleotideProxy, naMap: Map<NucleobaseType, ReferenceStructureData>, naType: NucleicAcidType): void {
    const pair = nucl.pairedNucleotide;

    if (pair === null || (pair !== null && nucl.parentStrand.globalId > pair.parentStrand.globalId)) {
        const refStruc = naMap.get(nucl.nucleobaseType)!;
        const pairRefStruc = pair ? naMap.get(pair.nucleobaseType)! : undefined;

        let basis = new Matrix4().makeBasis(
            nucl.baseShortAxis,
            nucl.hydrogenFaceDir,
            nucl.baseNormal);

        const desiredHydrFaceDir = refStruc.originToC1.clone().applyMatrix4(basis).negate().normalize();
        const vectorsTransf = new Quaternion()
            .setFromUnitVectors(nucl.hydrogenFaceDir, desiredHydrFaceDir)
            .inverse();

        nucl.hydrogenFaceDir = nucl.hydrogenFaceDir.applyQuaternion(vectorsTransf);
        nucl.baseNormal = nucl.baseNormal.applyQuaternion(vectorsTransf);
        transformNucleotideCentroidsFromOxDna(nucl, refStruc);

        if (pair) {
            pair.hydrogenFaceDir = pair.hydrogenFaceDir.applyQuaternion(vectorsTransf);
            pair.baseNormal = pair.baseNormal.applyQuaternion(vectorsTransf);
            transformNucleotideCentroidsFromOxDna(pair, pairRefStruc!);
        }
    }


    nucl.baseNormal = nucl.baseNormal.negate(); // TODO HOTFIX due to the oxView having the baseNormal inverted
}

function transformNucleotideCentroidsFromOxDna(nucl: CgNucleotideProxy, refStruc: ReferenceStructureData): void {
    const com: Vector3 = nucl.nucleobaseCenter.clone()
        .sub(nucl.hydrogenFaceDir.multiplyScalar(0.4 * oxDnaUnitsToAngst));

    const basis = new Matrix4().makeBasis(
        nucl.baseShortAxis,
        nucl.hydrogenFaceDir,
        nucl.baseNormal);

    const comToBb = (
        refStruc.originToBackboneCenter.clone()
            .sub(refStruc.originToCenterOfMass)
    ).applyMatrix4(basis);

    const comToNb = (
        refStruc.originToBaseCenter.clone()
            .sub(refStruc.originToCenterOfMass)
    ).applyMatrix4(basis);

    nucl.backboneCenter = com.clone().add(comToBb);
    nucl.nucleobaseCenter = com.clone().add(comToNb);
}