import { Filter, Structure } from "../../catana";
import CgStructure from "../data_model/cg-structure";
import { Matrix4, Quaternion, Vector3 } from "three";
import { AminoAcidStructuresMap, AminoAcidStructuresProvider } from "./structure-providers/amino-acid-structures-provider";
import { NucleicAcidStructuresProvider, NucleotideStructuresMap } from "./structure-providers/nucleic-acid-structures-provider";
import { AminoAcidType, aminoAcidTypeToThreeLetterCode, NucleobaseType, nucleobaseTypeToPdbResidueCode } from "../data_model/types_declarations/monomer-types";
import { assignResidueTypeBonds, calculateBonds, calculateSecondaryStructure, getResidueAtomsFilterString, rotateAroundAtomsVector, transformAtoms } from "../../structure/structure-utils";
import AtomProxy from "../../proxy/atom-proxy";

/**
 * Class maintaining information about the maximum number of atoms that can be generated.
 * Default limit is set to 99,999 as it is the maximum serial number for PDB atoms,
 * while it is also a number which takes "reasonable time" to generate.
 */
export abstract class AtomGenerationLimit {
    private static _max: number = 99999;

    /**
     * @returns current maximum number of atoms to be generated
     */
    public static getMaximum(): number {
        return this._max;
    }

    /**
     * Sets new maximum number of atoms Catana can generate
     * @param newMax new maximum
     */
    public static setNewMaximum(newMax: number): void {
        this._max = newMax;
    }
}

/**
 * Generates atomistic structure for given coarse-grained one.
 * 
 * @param cgStructure coarse-grained structure for which the atoms should be generated
 * @param existingStructureToReplace if defined, the generation will store the data into this structure instance (replacing existing ones). 
 * Otherwise, new instance of Structure class is created.
 * @returns promise resolving with the newly generated atomistic structure. 
 * If the number of atoms would exceed the maximum limit, the promise is rejected.
 */
export function generateAtomisticStructure(cgStructure: CgStructure, existingStructureToReplace?: Structure): Promise<Structure> {
    return new Promise<Structure>((resolve, reject) => {
        const promises = [
            NucleicAcidStructuresProvider.loadStructures(),
            AminoAcidStructuresProvider.loadAminoAcids()
        ];

        Promise.all<unknown>(promises).then(maps => {
            let aaStructure: Structure;
            let newStructureName = cgStructure.name;

            if (!newStructureName.includes("_all_atom")) {
                newStructureName += "_all_atom";
            }

            if (existingStructureToReplace) {
                // Trying a simple approach to erase all existing structural data
                existingStructureToReplace.dispose();
                existingStructureToReplace.init(newStructureName, "");
                aaStructure = existingStructureToReplace;
            } else {
                aaStructure = new Structure(newStructureName);
            }

            const as = aaStructure.atomStore;
            const rs = aaStructure.residueStore;
            const cs = aaStructure.chainStore;
            const ms = aaStructure.modelStore;

            const nsMap = maps[0] as NucleotideStructuresMap;
            const aaMap = maps[1] as AminoAcidStructuresMap;

            let atomCount = 0;
            let residueCount = cgStructure.monomerCount;
            let chainCount = cgStructure.polymerCount;
            let modelCount = 1;

            let matrices: Matrix4[] = [];
            let refStructures: Structure[] = [];
            let resIndices: number[] = [];
            let resNames: string[] = [];

            // Resize the "higher-level" stores
            rs.resize(residueCount);
            rs.count = residueCount;

            cs.resize(chainCount);
            cs.count = chainCount;

            ms.resize(modelCount);
            ms.count = modelCount;

            let chainIdx = 0;
            let resIdx = 0;
            let atomIdx = 0;

            ms.chainCount[0] = chainCount;
            ms.chainOffset[0] = 0;

            // Compute the necessary data for determining the number of atoms
            // and their subsequent coordinate transformations
            cgStructure.forEachNaStrand(naStrand => {
                cs.entityIndex[chainIdx] = 0;
                cs.modelIndex[chainIdx] = 0;
                cs.residueOffset[chainIdx] = resIdx;
                cs.residueCount[chainIdx] = naStrand.length;
                cs.setChainname(chainIdx, naStrand.name.length > 0 ? naStrand.name[0] : "A");
                cs.setChainid(chainIdx, chainIdx.toString());

                naStrand.forEachNucleotide(nucl => {
                    const refStrucData = nsMap.get(naStrand.naType)!.get(nucl.nucleobaseType)!;
                    const refStruc = nucl.isFivePrime() ? refStrucData.structureFivePrime : refStrucData.structure;
                    atomCount += refStruc.atomCount;
                    refStructures.push(refStruc);

                    const basisChange = new Matrix4().makeBasis(
                        nucl.baseShortAxis.normalize(),
                        nucl.hydrogenFaceDir.normalize(),
                        nucl.baseNormal.normalize());

                    const originToNb = refStrucData.originToBaseCenter.clone().applyMatrix4(basisChange);
                    const nbCent = nucl.nucleobaseCenter;

                    matrices.push(new Matrix4().makeTranslation(
                        nbCent.x - originToNb.x,
                        nbCent.y - originToNb.y,
                        nbCent.z - originToNb.z)
                        .multiply(basisChange));

                    resIndices.push(resIdx);
                    resNames.push(nucleobaseTypeToPdbResidueCode(
                        nucl.nucleobaseType === NucleobaseType.ANY ? NucleobaseType.C : nucl.nucleobaseType,
                        naStrand.naType));

                    rs.chainIndex[resIdx] = chainIdx;
                    rs.atomOffset[resIdx] = atomIdx;
                    rs.atomCount[resIdx] = refStruc.atomCount;
                    rs.residueTypeId[resIdx] = 0;
                    rs.resno[resIdx] = resIdx;
                    rs.sstruc[resIdx] = 0; // TODO ?
                    rs.inscode[resIdx] = 0; // TODO ?

                    ++resIdx;
                    atomIdx += refStruc.atomCount;
                });

                ++chainIdx;
            });

            cgStructure.forEachAaChain(aaChain => {
                cs.entityIndex[chainIdx] = 0;
                cs.modelIndex[chainIdx] = 0;
                cs.residueOffset[chainIdx] = resIdx;
                cs.residueCount[chainIdx] = aaChain.length;
                cs.setChainname(chainIdx, aaChain.name.length > 0 ? aaChain.name[0] : "A");
                cs.setChainid(chainIdx, chainIdx.toString());

                aaChain.forEachAminoAcid(aa => {
                    const refStruc = aaMap.get(aa.aminoAcidType)!;
                    atomCount += refStruc.atomCount;
                    refStructures.push(refStruc);

                    // Compute the transformation to align the residue backbone
                    // with the direction between neigboring residues

                    let desiredDir = new Vector3(1, 0, 0);
                    let prevAa = aa.isNterm() ? undefined : aaChain.getAminoAcidProxy(aa.index - 1);
                    let nextAa = aa.isCterm() ? undefined : aaChain.getAminoAcidProxy(aa.index + 1);

                    if (prevAa && nextAa) {
                        desiredDir = nextAa.alphaCarbonLocation.sub(prevAa.alphaCarbonLocation);
                    } else if (prevAa) {
                        desiredDir = aa.alphaCarbonLocation.sub(prevAa.alphaCarbonLocation);
                    } else if (nextAa) {
                        desiredDir = nextAa.alphaCarbonLocation.sub(aa.alphaCarbonLocation);
                    }

                    desiredDir.normalize();

                    // TODO Far from being optimal to do this for every structure repeatedly
                    const thisAaRp = refStruc.getResidueProxy(0);
                    const thisAaBbStart = refStruc.getAtomProxy(thisAaRp.backboneStartAtomIndex);
                    const thisAaBbEnd = refStruc.getAtomProxy(thisAaRp.backboneEndAtomIndex);

                    const thisAaBbDir = new Vector3(
                        thisAaBbEnd.x - thisAaBbStart.x,
                        thisAaBbEnd.y - thisAaBbStart.y,
                        thisAaBbEnd.z - thisAaBbStart.z
                    ).normalize();

                    const changeDirTransf = new Matrix4().makeRotationFromQuaternion(
                        new Quaternion().setFromUnitVectors(thisAaBbDir, desiredDir));

                    const thisAaCa = refStruc.getAtomProxy(thisAaRp.getAtomIndexByName("CA"));
                    const thisAaCaPos = thisAaCa.positionToVector3().applyMatrix4(changeDirTransf);
                    const aaCaPos = aa.alphaCarbonLocation;

                    matrices.push(new Matrix4().makeTranslation(
                        aaCaPos.x - thisAaCaPos.x,
                        aaCaPos.y - thisAaCaPos.y,
                        aaCaPos.z - thisAaCaPos.z).multiply(
                            new Matrix4().makeRotationFromQuaternion(
                                new Quaternion().setFromUnitVectors(thisAaBbDir, desiredDir))
                        ));

                    resIndices.push(resIdx);
                    resNames.push(aminoAcidTypeToThreeLetterCode(
                        aa.aminoAcidType === AminoAcidType.ANY ? AminoAcidType.LEU : aa.aminoAcidType));

                    rs.chainIndex[resIdx] = chainIdx;
                    rs.atomOffset[resIdx] = atomIdx;
                    rs.atomCount[resIdx] = refStruc.atomCount;
                    rs.residueTypeId[resIdx] = 0;
                    rs.resno[resIdx] = resIdx;
                    rs.sstruc[resIdx] = 0;
                    rs.inscode[resIdx] = 0;

                    ++resIdx;
                    atomIdx += refStruc.atomCount;
                });

                ++chainIdx;
            });

            if (atomCount > AtomGenerationLimit.getMaximum()) {
                reject("More than " + AtomGenerationLimit.getMaximum() + " atoms cannot be generated! You can change this number in Structure configurations.");
                return;
            }

            // Resize the atom store also
            as.resize(atomCount);
            as.count = atomCount;

            atomIdx = 0;

            // Go through all residues (resp. their reference structures) and their atoms
            for (let i = 0; i < refStructures.length; ++i) {
                let atomIds: number[] = [];

                for (let j = 0; j < refStructures[i].atomCount; ++j) {
                    as.residueIndex[atomIdx] = resIndices[i];

                    const refAtomtype = refStructures[i].atomMap.get(refStructures[i].atomStore.atomTypeId[j]);
                    as.atomTypeId[atomIdx] = aaStructure.atomMap.add(refAtomtype.atomname, refAtomtype.element);
                    atomIds.push(as.atomTypeId[atomIdx]);

                    as.serial[atomIdx] = atomIdx;
                    as.bfactor[atomIdx] = 0;
                    as.altloc[atomIdx] = 0;
                    as.occupancy[atomIdx] = 1;

                    const position = new Vector3(
                        refStructures[i].atomStore.x[j],
                        refStructures[i].atomStore.y[j],
                        refStructures[i].atomStore.z[j]);

                    position.applyMatrix4(matrices[i]);
                    as.x[atomIdx] = position.x;
                    as.y[atomIdx] = position.y;
                    as.z[atomIdx] = position.z;

                    ++atomIdx;
                }

                rs.residueTypeId[resIndices[i]] = aaStructure.residueMap.add(resNames[i], atomIds, false);
            }

            // Finalize the structure and its bonds
            aaStructure.finalizeAtoms();

            // During the second step, DNA backbone atoms are adjusted
            //
            // To achieve this, several different conformations of backbone
            // atoms are calculated and then compared with a common parameters.
            // The best performing conformation is then selected as final one.
            // Conformations are generated by rotating the backbone or its part
            // around the selected bonds (i.e., selected torsion angles are modified)

            let isFirstResidue = true; // For first residue, backbone is left as is
            let lastResidueO3Pos: Vector3 = new Vector3();

            aaStructure.eachResidue(rp => {
                if (!rp.isDna()) {
                    return;
                }

                if (isFirstResidue) {
                    isFirstResidue = false;
                    lastResidueO3Pos = aaStructure.getAtomProxy(rp.getAtomIndexByName("O3'")).positionToVector3();
                    return;
                }

                let conformationsData = [
                    // Bond between nucleobase and sugar
                    {
                        atomBondStart: rp.residueType.isPurineNucleotide() ? "N9" : "N1",
                        atomBondEnd: "C1'",
                        // Since the residue numbers etc. may be duplicate, explicit list of backbone atom indices is used
                        // instead of simply refering to "<resno> AND backbone"
                        atomGroupFilter: aaStructure.getAtomSet(
                            new Filter(
                                getResidueAtomsFilterString(rp, ap => ap.isBackbone()))
                        ),
                        angles: [0, 5, 10, 15, 30, 45, 90],
                        atomBondStartAp: undefined as AtomProxy | undefined,
                        atomBondEndAp: undefined as AtomProxy | undefined,
                    },
                    // Bond between sugar and phosphate group
                    {
                        atomBondStart: "C5'",
                        atomBondEnd: "O5'",
                        // In this case, only phosphate group atoms (+ 5' sugar oxygen) are considered
                        atomGroupFilter: aaStructure.getAtomSet(
                            new Filter(
                                getResidueAtomsFilterString(rp, ap => ["P", "OP1", "OP2", "O5'"].indexOf(ap.atomname) >= 0))
                        ),
                        angles: [-60, -30, -20, -10, 0, 10, 20, 30, 60],
                        atomBondStartAp: undefined as AtomProxy | undefined,
                        atomBondEndAp: undefined as AtomProxy | undefined,
                    },
                ];

                for (let conf of conformationsData) {
                    conf.atomBondStartAp = aaStructure.getAtomProxy(rp.getAtomIndexByName(conf.atomBondStart));
                    conf.atomBondEndAp = aaStructure.getAtomProxy(rp.getAtomIndexByName(conf.atomBondEnd));
                }

                const thisPhosphate = aaStructure.getAtomProxy(rp.getAtomIndexByName("P"));
                let bestScoreConformation: Matrix4[] = [];
                let lowestEvalScore: number | undefined = undefined;

                const getEvalScoreFunc = () => {
                    // The measurements performed on DNA-containing PDB structures revealed
                    // that the length of the phosphodiester bond (connecting sugar and phosphate groups)
                    // between phoshpate P and oxygen O5' seems to be about 1.6 angstroms.
                    // This seems to roughly correspond to the VDW radii distance between the O/P atoms.
                    //
                    // In any case, this evaluation functions measures the distance between these two
                    // atoms in the structure and returns the difference from the "ideal one".
                    const desiredBondLength = 1.6;
                    const thisPhosphatePos = thisPhosphate.positionToVector3();

                    return Math.abs(thisPhosphatePos.distanceTo(lastResidueO3Pos) - desiredBondLength);
                };

                // During the initial step where all the conformations are evaluated/scored,
                // only a subset of backbone atoms are relevant. Therefore, transforming all backbone
                // atoms would be unnecessary computational overload.
                // For this reason, only the relevant atoms are transformed and the "full" backbone
                // transformation happens only when the best conformation is selected.
                //
                // WARNING: This idea is valid with the current evaluation function comparing P-O3' bond length.
                //          If the evaluation was more complex, this may need to be improved/extended.
                let atomsToTransform: AtomProxy[] = [thisPhosphate];
                let originalAtomsPositions: Vector3[] = [thisPhosphate.positionToVector3()];

                for (let conf of conformationsData) {
                    atomsToTransform.push(conf.atomBondStartAp!,
                        conf.atomBondEndAp!);

                    originalAtomsPositions.push(conf.atomBondStartAp!.positionToVector3(),
                        conf.atomBondEndAp!.positionToVector3());
                }

                tryConfDataCombinations(conformationsData, [], (currConfAngles: number[]) => {
                    let conformMatrices = [];

                    // Step-by-step multiplication of atoms' positions by individual conf. matrices
                    // Each subsequent matrix is generated based on data of already transformed atoms
                    for (let i = 0; i < conformationsData.length; ++i) {
                        const transfMatrix = rotateAroundAtomsVector(
                            conformationsData[i].atomBondStartAp!,
                            conformationsData[i].atomBondEndAp!,
                            currConfAngles[i])[0];

                        for (let ap of atomsToTransform) {
                            if (conformationsData[i].atomGroupFilter.isSet(ap.index)) {
                                ap.positionFromVector3(
                                    ap.positionToVector3().applyMatrix4(transfMatrix)
                                );
                            }
                        }

                        conformMatrices.push(transfMatrix);
                    }

                    const thisScore = getEvalScoreFunc();

                    if (lowestEvalScore === undefined || thisScore < lowestEvalScore) {
                        lowestEvalScore = thisScore;
                        bestScoreConformation = conformMatrices;
                    }

                    // Reset atoms positions to compute all combinations starting from the same data
                    for (let i = 0; i < atomsToTransform.length; ++i) {
                        atomsToTransform[i].positionFromVector3(originalAtomsPositions[i]);
                    }
                });

                // Best-performing conformation is applied in the end
                // Matrices are applied one-by-one, in the same order as during the evaluation

                for (let i = 0; i < bestScoreConformation.length; ++i) {
                    transformAtoms(aaStructure, bestScoreConformation[i], false, conformationsData[i].atomGroupFilter);
                }

                lastResidueO3Pos = aaStructure.getAtomProxy(rp.getAtomIndexByName("O3'")).positionToVector3();
            });

            function tryConfDataCombinations(confData: any[], currAngles: number[], callback: (angleComb: number[]) => void) {
                const thisIdx = currAngles.length;

                for (let i = 0; i < confData[thisIdx].angles.length; ++i) {
                    let anglesCopy = currAngles.slice(0);
                    anglesCopy.push(confData[thisIdx].angles[i]);

                    if (thisIdx === confData.length - 1) {
                        // anglesCopy now stores a valid combination where index i corresponds to
                        // the angle used by confData[i]
                        callback(anglesCopy);
                    } else {
                        tryConfDataCombinations(confData, anglesCopy, callback);
                    }
                }
            }

            aaStructure.finalizeAtoms();
            aaStructure.finalizeBonds();

            calculateBonds(aaStructure);
            assignResidueTypeBonds(aaStructure);
            aaStructure.finalizeBonds();

            calculateSecondaryStructure(aaStructure);
            resolve(aaStructure);
        });

        // TODO pdbId not assigned. In other words, no connection between CG and AA residues.
    });
}