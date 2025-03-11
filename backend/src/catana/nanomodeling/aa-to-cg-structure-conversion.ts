import { Structure } from "../../catana";
import { DnaType } from "../../structure/structure-constants";
import { duplicateStructure } from "../../structure/structure-utils";
import CgAminoAcidChain from "../data_model/cg-amino-acid-chain";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgStructure from "../data_model/cg-structure";
import { pdbResidueCodeToNucleobaseType, threeLetterCodeToAminoAcidType } from "../data_model/types_declarations/monomer-types";
import { NucleicAcidType } from "../data_model/types_declarations/polymer-types";
import GlobalIdGenerator from "../utils/global-id-generator";
import { computeBaseHydrogenFaceDir, computeBaseNormal } from "./nucleic-acid-utils";

/**
 * Converts given all-atom structure to a coarse-grained one.
 * @param sourceStructure all-atom structure to be converted
 * @returns coarse-grained equivalent of the input all-atom structure
 * @throws Throws an error in case the conversion cannot be performed successfully
 */
export function convertAllAtomStructureToCoarseGrained(sourceStructure: Structure): CgStructure {
    const newCgStructure = new CgStructure(GlobalIdGenerator.generateId(),
        sourceStructure.name.length > 0 ? sourceStructure.name.replace(/\.pdb|_all_atom/gi, "") : "CG structure",
        "Catana converted from " + sourceStructure.title);

    newCgStructure.atomicStructure = duplicateStructure(sourceStructure);

    newCgStructure.atomicStructure.eachChain(chainProxy => {
        if (chainProxy.residueCount === 0) {
            return;
        }

        const startRes = chainProxy.structure.getResidueProxy(chainProxy.residueOffset);

        if (startRes.isNucleic()) {
            const newStrand = new CgNucleicAcidStrand(
                GlobalIdGenerator.generateId(),
                chainProxy.chainname,
                startRes.moleculeType === DnaType ? NucleicAcidType.DNA : NucleicAcidType.RNA,
                newCgStructure,
                chainProxy.residueCount);

            chainProxy.eachResidue(rp => {
                const nbType = pdbResidueCodeToNucleobaseType(rp.resname);

                newStrand.insertNewThreePrimeNucleotide(
                    GlobalIdGenerator.generateId(),
                    nbType,
                    rp.getSidechainCentroid(),
                    rp.getBackboneCentroid(),
                    computeBaseNormal(nbType, rp),
                    computeBaseHydrogenFaceDir(nbType, rp),
                    undefined,
                    rp.resno
                );
            });

            newCgStructure.addNaStrand(newStrand);
        } else if (startRes.isProtein()) {
            const newChain = new CgAminoAcidChain(
                GlobalIdGenerator.generateId(),
                chainProxy.chainname,
                newCgStructure,
                chainProxy.residueCount
            );

            chainProxy.eachResidue(rp => {
                const aaType = threeLetterCodeToAminoAcidType(rp.resname);

                newChain.insertNewCtermAminoAcid(
                    GlobalIdGenerator.generateId(),
                    aaType,
                    newCgStructure.atomicStructure!
                        .getAtomProxy(rp.getAtomIndexByName("CA")).positionToVector3(),
                    rp.resno
                )
            });

            newCgStructure.addAaChain(newChain);
        }
    });

    newCgStructure.generateBasePairs();

    return newCgStructure;
}
