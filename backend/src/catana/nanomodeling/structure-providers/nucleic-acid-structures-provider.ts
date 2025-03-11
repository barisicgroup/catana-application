import Structure from "../../../structure/structure";
import { Matrix4, Vector3 } from "three";
import { exportFilteringAsNewStructure, transformAtoms } from "../../../structure/structure-utils";
import { SpecificDnaNucleobaseType, nucleobaseTypeToPdbResidueCode, NucleobaseType, SpecificRnaNucleobaseType, isPurineNucleobase } from "../../data_model/types_declarations/monomer-types";
import { computeBaseNormal, computeBaseShortAxis, computeBaseHydrogenFaceDir } from "../nucleic-acid-utils";
import { NucleicAcidType } from "../../data_model/types_declarations/polymer-types";
import { Filter } from "../../../catana";

import dtdaPdbString from "./pdb_structures/deoxyribonucleotides/DTDA.pdb";
import dcdgPdbString from "./pdb_structures/deoxyribonucleotides/DCDG.pdb";

import aPdbString from "./pdb_structures/ribonucleotides/A.pdb";
import cPdbString from "./pdb_structures/ribonucleotides/C.pdb";
import gPdbString from "./pdb_structures/ribonucleotides/G.pdb";
import uPdbString from "./pdb_structures/ribonucleotides/U.pdb";
import StringStreamer from "../../../streamer/string-streamer";
import PdbParser from "../../../parser/pdb-parser";

export const DnaPdbsContent: { [k: string]: string } = {
    "DTDA": dtdaPdbString,
    "DCDG": dcdgPdbString,
}

export const RnaPdbsContent: { [k: string]: string } = {
    "A": aPdbString,
    "C": cPdbString,
    "G": gPdbString,
    "U": uPdbString,
}

/**
 * Type used for storing the reference to all-atom nucleotide structure
 * together with some additional computed values
 */
export type ReferenceStructureData = {
    /**
     * Reference to all-atom structure of this nucleotide
     */
    structure: Structure,
    /**
     * Reference to all-atom structure of this nucleotide that
     * should be used at the 5' end of the strand (as it contains no phosphate group)
     */
    structureFivePrime: Structure,
    /**
     * Vector from the origin of the base-pair to the center of mass of the nucleotide
     */
    originToCenterOfMass: Vector3,
    /**
     * Vector from the origin of the base-pair to the center of mass of the nucleobase
     */
    originToBaseCenter: Vector3,
    /**
     * Vector from the origin of the base-pair to the center of mass of the backbone
     */
    originToBackboneCenter: Vector3,
    /**
     * Vector from the origin of the base-pair to the C1' atom
     */
    originToC1: Vector3
}

export type NucleotideStructuresMap = Map<NucleicAcidType, Map<NucleobaseType, ReferenceStructureData>>;

/**
 * Class providing reference data/statistics for individiual nucleobase types
 */
export class NucleicAcidStructuresProvider {
    /**
     * If the user request a structure for undefined nucleobase type (which can thus bear any type),
     * the value of this variable is retrieved.
     */
    private static _nbTypeForAny: NucleobaseType = NucleobaseType.C;

    private static _alignedNucleotides: NucleotideStructuresMap = new Map();

    private static readonly _naTypesLength: number = Object.keys(NucleicAcidType).length;

    private static readonly _dnaNucleobasesToLoad: SpecificDnaNucleobaseType[] = [
        NucleobaseType.T, NucleobaseType.A, NucleobaseType.C, NucleobaseType.G // Order matters
    ];

    private static readonly _rnaNucleobasesToLoad: SpecificRnaNucleobaseType[] = [
        NucleobaseType.A, NucleobaseType.U, NucleobaseType.C, NucleobaseType.G
    ];

    /**
     * Returns map storing the reference nucleotide structures.
     * It is up to the caller to ensure that the map has been already properly initialized.
     */
    public static get nucleicAcidStructures(): NucleotideStructuresMap {
        return this._alignedNucleotides;
    }

    /**
     * Starts the process of loading the reference nucleotide atomistic structures
     * 
     * @returns promise which resolves after the structures are loaded and reference data are computed
     */
    public static loadStructures(): Promise<NucleotideStructuresMap> {
        return new Promise<NucleotideStructuresMap>((resolve, reject) => {
            this.processStructuresFiles().then(
                (ntmp: NucleotideStructuresMap) => resolve(ntmp),
                (e) => reject(e));
        });
    }

    /**
     * Loads structures, aligns them with desired reference frame, 
     * collects reference data and resolves with map of nucleotide structures.
     */
    private static processStructuresFiles(): Promise<NucleotideStructuresMap> {
        return new Promise<NucleotideStructuresMap>((resolve, reject) => {
            if (this._alignedNucleotides.size === this._naTypesLength) {
                resolve(this._alignedNucleotides);
            } else {
                let nbToStrArr = this._dnaNucleobasesToLoad
                    .map(x => nucleobaseTypeToPdbResidueCode(x, NucleicAcidType.DNA));
                let dnaBasesToLoad = [nbToStrArr[0] + nbToStrArr[1], nbToStrArr[2] + nbToStrArr[3]];

                let rnaBasesToLoad = this._rnaNucleobasesToLoad
                    .map(x => nucleobaseTypeToPdbResidueCode(x, NucleicAcidType.RNA));

                const promises: Array<Promise<Structure>> = [];

                for (let i in dnaBasesToLoad) {
                    let streamer = new StringStreamer(DnaPdbsContent[dnaBasesToLoad[i]]);
                    promises.push(new PdbParser(streamer).parse());
                }

                for (let i in rnaBasesToLoad) {
                    let streamer = new StringStreamer(RnaPdbsContent[rnaBasesToLoad[i]]);
                    promises.push(new PdbParser(streamer).parse());
                }

                Promise.all(promises).then((bases: Structure[]) => {
                    this._alignedNucleotides.clear();

                    const dnaMap = new Map<NucleobaseType, ReferenceStructureData>();
                    const rnaMap = new Map<NucleobaseType, ReferenceStructureData>();

                    for (let i = 0; i < bases.length; ++i) {
                        if (i < dnaBasesToLoad.length) { // We process DNA structures ...
                            // DNA bases are extracted from base-pair PDBs since they are
                            // nicely origin-centered and thus better for design tasks
                            const b1 = this._dnaNucleobasesToLoad[2 * i];
                            const b2 = this._dnaNucleobasesToLoad[2 * i + 1];
                            const s1 = exportFilteringAsNewStructure(bases[i], new Filter(nbToStrArr[2 * i]));
                            const s2 = exportFilteringAsNewStructure(bases[i], new Filter(nbToStrArr[2 * i + 1]));

                            this.alignBaseWithUNFReferenceFrame(b1, s1, false);
                            dnaMap.set(b1, this.getRefStructureData(b1, s1));

                            this.alignBaseWithUNFReferenceFrame(b2, s2, false);
                            dnaMap.set(b2, this.getRefStructureData(b2, s2));

                        } else { // ... then we process RNA structures.
                            const j = i - dnaBasesToLoad.length;
                            const nbType = this._rnaNucleobasesToLoad[j];
                            this.alignBaseWithUNFReferenceFrame(nbType, bases[i]);
                            rnaMap.set(nbType, this.getRefStructureData(nbType, bases[i]));
                        }
                    }

                    dnaMap.set(NucleobaseType.ANY, dnaMap.get(this._nbTypeForAny)!);
                    rnaMap.set(NucleobaseType.ANY, rnaMap.get(this._nbTypeForAny)!);

                    this._alignedNucleotides.set(NucleicAcidType.DNA, dnaMap);
                    this._alignedNucleotides.set(NucleicAcidType.RNA, rnaMap);
                    // For XNA, RNA map is used at the moment
                    this._alignedNucleotides.set(NucleicAcidType.XNA, rnaMap);

                    resolve(this._alignedNucleotides);
                },
                    e => reject(e));
            }
        });
    }

    /**
     * This function tries to align base pair structures according to the nucleotide standard reference frame
     * as defined by Olson et al. in "A Standard Reference Frame for the Description of Nucleic Acid Base-pair Geometry" (2001)
     * and 3DNA papers. However, there may be differences between this implementation and aforementioned sources.
     * 
     * @param bpStructure structure to be aligned
     */
    public static alignBasePairWithStdReferenceFrame(bpStructure: Structure): void {
        const yBase = bpStructure.getResidueProxy(0);
        const rBase = bpStructure.getResidueProxy(1);

        const yC1Atom = bpStructure.getAtomProxy(yBase.getAtomIndexByName("C1'"));
        const rC1Atom = bpStructure.getAtomProxy(rBase.getAtomIndexByName("C1'"));

        const yN1Atom = bpStructure.getAtomProxy(yBase.getAtomIndexByName("N1"));
        const yC2Atom = bpStructure.getAtomProxy(yBase.getAtomIndexByName("C2"));
        const yN3Atom = bpStructure.getAtomProxy(yBase.getAtomIndexByName("N3"));

        const c2n1 = yN1Atom.positionToVector3().sub(yC2Atom.positionToVector3()).normalize();
        const c2n3 = yN3Atom.positionToVector3().sub(yC2Atom.positionToVector3()).normalize();

        const refAxisY = rC1Atom.positionToVector3().sub(yC1Atom.positionToVector3()).normalize();
        const refAxisZ = c2n3.cross(c2n1).normalize();
        const refAxisX = refAxisY.clone().cross(refAxisZ).normalize();

        let coordSpaceTransfMatrix = new Matrix4();

        coordSpaceTransfMatrix.set(
            refAxisX.x, refAxisY.x, refAxisZ.x, 0,
            refAxisX.y, refAxisY.y, refAxisZ.y, 0,
            refAxisX.z, refAxisY.z, refAxisZ.z, 0,
            0, 0, 0, 1
        ).transpose();

        transformAtoms(bpStructure, coordSpaceTransfMatrix, true);
        bpStructure.finalizeAtoms();
    }

    /**
     * Aligns the base with a UNF nucleobase reference frame (computed based on atoms of a single base)
     * 
     * @param nbType nucleobase type
     * @param baseStructure reference structure (atoms of this structure will be modified)
     * @param shiftFromOrigin if set to true, the atoms will be shifted to have their center roughly on the pseudodyad base-pair axis
     */
    public static alignBaseWithUNFReferenceFrame(nbType: NucleobaseType, baseStructure: Structure, shiftFromOrigin: boolean = true): void {
        const baseResidue = baseStructure.getResidueProxy(0);

        const refAxisX = computeBaseShortAxis(nbType, baseResidue);
        const refAxisY = computeBaseHydrogenFaceDir(nbType, baseResidue);
        const refAxisZ = computeBaseNormal(nbType, baseResidue);

        // TODO Not sure why the transpose is necessary but it seems to does not work well without it
        // as some axes appear to be incorrect
        let coordSpaceTransfMatrix = new Matrix4().makeBasis(refAxisX, refAxisY, refAxisZ).transpose();

        transformAtoms(baseStructure, coordSpaceTransfMatrix, true);

        if (shiftFromOrigin) {
            // After the structure is aligned with the reference axes,
            // shift its atoms to make them roughly centered on pseudodyad base-pair axis / helical axis
            // ====
            // Precondition: in the source PDB files, the C1' atom is at (0, 0, 0) location
            const basePairC1dist = 10.5;  // The distance between base pairs' C1' atoms should be around 10.5 angstroms in B-DNA
            const yAxisShift = -(basePairC1dist / 2);

            const xAxisCenterAtom = isPurineNucleobase(nbType) ? baseResidue.getAtomIndexByName("N1") : baseResidue.getAtomIndexByName("N3");
            const xAxisShift = -baseStructure.getAtomProxy(xAxisCenterAtom).x;

            const translation = new Matrix4().makeTranslation(xAxisShift, yAxisShift, 0);

            transformAtoms(baseStructure, translation, true);
        }
        baseStructure.finalizeAtoms();
    }

    private static getRefStructureData(nbType: NucleobaseType, structure: Structure): ReferenceStructureData {
        const rp = structure.getResidueProxy(0);

        const bbCenter = rp.getBackboneCentroid();
        const nbCenter = rp.getSidechainCentroid();
        const c1pos = structure.getAtomProxy(rp.getAtomIndexByName("C1'")).positionToVector3();
        const c1len = c1pos.length();
        c1pos.projectOnPlane(new Vector3(0, 0, 1)).normalize().multiplyScalar(c1len);

        const fivePrimeStructure = structure.clone();
        // Remove phosphate groups from 5' end structure
        fivePrimeStructure.removeAtomsWhere(ap =>
            ["P", "OP1", "OP2"].includes(ap.atomname));

        return {
            structure: structure,
            structureFivePrime: fivePrimeStructure,
            // Origin is at (0, 0, 0) in aligned reference structures
            // thus no subtraction from the center values
            originToCenterOfMass: rp.getAtomCentroid(),
            originToBaseCenter: nbCenter,
            originToBackboneCenter: bbCenter,
            originToC1: c1pos
        }
    }
}

export default NucleicAcidStructuresProvider;