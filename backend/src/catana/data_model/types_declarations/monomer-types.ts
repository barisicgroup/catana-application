import { NucleicAcidType } from "./polymer-types";

// TODO
// Some of the conversions here etc. overlap (are redundant)
// with data in structure-constants and related (e.g., ResidueProxy.getResname1).
// Think about way how to make this better.

/**
 * Enumeration of supported nucleobases
 */
export enum NucleobaseType {
    A = "A",
    T = "T",
    C = "C",
    G = "G",
    U = "U",
    ANY = "N" // May be any of the above
}

/**
 * Enumeration of supported amino acids
 */
export enum AminoAcidType {
    ALA = "A",
    ARG = "R",
    ASN = "N",
    ASP = "D",
    CYS = "C",
    GLU = "E",
    GLN = "Q",
    GLY = "G",
    HIS = "H",
    ILE = "I",
    LEU = "L",
    LYS = "K",
    MET = "M",
    PHE = "F",
    PRO = "P",
    SEC = "U",
    SER = "S",
    THR = "T",
    TRP = "W",
    TYR = "Y",
    VAL = "V",
    ANY = "X" // May be any of the above
}

/**
 * Supported monomer/residue types
 */
export type MonomerType = NucleobaseType | AminoAcidType;

/**
 * Valid/well-defined DNA nucleobase types
 */
export type SpecificDnaNucleobaseType = NucleobaseType.A | NucleobaseType.T | NucleobaseType.C | NucleobaseType.G;

/**
 * DNA-compatible nucleobase types
 */
export type DnaNucleobaseType = SpecificDnaNucleobaseType | NucleobaseType.ANY;

/**
 * Valid/well-defined RNA nucleobase types
 */
export type SpecificRnaNucleobaseType = NucleobaseType.A | NucleobaseType.U | NucleobaseType.C | NucleobaseType.G;

/**
 * RNA-compatible nuclebase types
 */
export type RnaNucleobaseType = SpecificRnaNucleobaseType | NucleobaseType.ANY;

/**
 * Valid/well-defined (D)(R)NA nucleobase types
 */
export type SpecificDnaRnaCommonNucleobaseType = SpecificDnaNucleobaseType & SpecificRnaNucleobaseType;

/**
 * Nucleobases shared amongst DNA & RNA 
 */
export type DnaRnaCommonNucleobaseType = (SpecificDnaNucleobaseType & SpecificRnaNucleobaseType) | NucleobaseType.ANY;

// ========================================================
// Conversions between string and enum types and vice versa
// ========================================================

/**
 * Converts given monomer type to a string code
 * 
 * @param monType monomer type to convert
 * @returns one-letter string storing the type name
 */
export function monomerTypeToOneLetterCode(monType: MonomerType): string {
    return monType;
}

/**
 * Converts given monomer type to one-letter char code
 * 
 * @param monType monomer type to convert
 * @returns number / char code storing the type identification
 */
export function monomerTypeToOneLetterCharCode(monType: MonomerType): number {
    return (monType as string).charCodeAt(0);
}

/**
 * Converts one-letter string IUPAC code to nucleobase type
 * 
 * @param code one-letter string storing the nucleobase name
 * @returns converted nucleobase type or NucleobaseType.ANY if the string was not recognized
 */
export function oneLetterCodeToNucleobaseType(code: string): NucleobaseType {
    const upper = code.toUpperCase();

    if (upper === "A") {
        return NucleobaseType.A;
    }
    else if (upper === "T") {
        return NucleobaseType.T;
    }
    else if (upper === "C") {
        return NucleobaseType.C;
    }
    else if (upper === "G") {
        return NucleobaseType.G;
    }
    else if (upper === "U") {
        return NucleobaseType.U;
    }

    return NucleobaseType.ANY;
}

/**
 * Converts one letter IUPAC string to amino acid type
 * 
 * @param code one-letter code storing the amino acid name
 * @returns converted amino acid type or AminoAcidType.ANY if the string was not recognized
 */
export function oneLetterCodeToAminoAcidType(code: string): AminoAcidType {
    // The oneLetterCodeToNucleobaseType function was implemented in the same way previously
    // but it turned out to be really slow. Therefore, it was reimplemented (albeit less "generally").
    // If the slow performance of this function will also turn out to be an issue, it might need
    // to be reimplemented in a similar fashion.
    if (Object.values(AminoAcidType).some((c: string) => c === code.toUpperCase())) {
        return code as AminoAcidType;
    }

    return AminoAcidType.ANY;
}

/**
 * Converts given amino acid type to three-letter code
 * 
 * @param aaType input amino acid type
 * @returns Three-letter string code corresponding to the input type
 */
export function aminoAcidTypeToThreeLetterCode(aaType: AminoAcidType): string {
    return Object.entries(AminoAcidType).find(
        (entry: [string, AminoAcidType]) => { return entry[1] === aaType; })![0];
}

/**
 * Converts given three-letter string to amino acid type
 * 
 * @param code three-letter amino acid code
 * @returns Corresponding amino acid type or AminoAcidType.ANY if not recognized
 */
export function threeLetterCodeToAminoAcidType(code: string): AminoAcidType {
    const atRec = Object.entries(AminoAcidType).find(
        (entry: [string, AminoAcidType]) => { return entry[0] === code.toUpperCase(); });
    return atRec ? atRec[1] : AminoAcidType.ANY;
}

/**
 * Converts given nucleobase type to PDB-compatible residue name string
 * 
 * @param nbType input nucleobase type
 * @param naType type of nucleic acid strand
 * @returns one- or two- letter string storing the PDB-compatible residue name of the input type
 */
export function nucleobaseTypeToPdbResidueCode(nbType: SpecificDnaNucleobaseType | SpecificRnaNucleobaseType,
    naType: NucleicAcidType): string {
    // XNA is handled as RNA now
    return (naType === NucleicAcidType.DNA ? "D" : "") + monomerTypeToOneLetterCode(nbType);
}

/**
 * Converts given PDB residue code to nucleobase type
 * 
 * @param code input string containing the residue name from the PDB
 * @returns nucleobase type corresponding to the given code (or NucleobaseType.ANY if not recognized)
 */
export function pdbResidueCodeToNucleobaseType(code: string): NucleobaseType {
    return oneLetterCodeToNucleobaseType(code.length > 1 ? code[1].toUpperCase() : code[0].toUpperCase());
}

// =============================================
// Utility functions regarding the monomer types
// =============================================

/**
 * Detects whether the given nucleobase is of purine type
 * 
 * @param nbType input type
 * @returns true if the input base is purine
 */
export function isPurineNucleobase(nbType: NucleobaseType): boolean {
    return nbType === NucleobaseType.A || nbType === NucleobaseType.G;
}

/**
 * Detects whether the given nucleobase is of pyrimidine type
 * 
 * @param nbType input type
 * @returns true if the input base is pyrimidine
 */
export function isPyrimidineNucleobase(nbType: NucleobaseType): boolean {
    return nbType === NucleobaseType.T || nbType === NucleobaseType.C || nbType === NucleobaseType.U;
}

function _getComplementaryBaseCore(nbType: NucleobaseType.C | NucleobaseType.G | NucleobaseType.ANY): DnaRnaCommonNucleobaseType {
    switch (nbType) {
        case NucleobaseType.C:
            return NucleobaseType.G;
        case NucleobaseType.G:
            return NucleobaseType.C;
    }

    return NucleobaseType.ANY;
}

/**
 * Returns complementary base type
 * 
 * @param nbType source base type
 * @param naType source nucleic acid type
 * @returns complementary nucleobase type
 */
export function getComplementaryBase(nbType: NucleobaseType, naType: NucleicAcidType): NucleobaseType {
    if (naType === NucleicAcidType.DNA) {
        return getComplementaryDnaBase(nbType as DnaNucleobaseType);
    }
    // XNA is handled as RNA now
    return getComplementaryRnaBase(nbType as RnaNucleobaseType);
}

/**
 * Returns complementary DNA base type
 * 
 * @param nbType source base type
 * @returns complementary nucleobase type
 */
export function getComplementaryDnaBase(nbType: DnaNucleobaseType): DnaNucleobaseType {
    switch (nbType) {
        case NucleobaseType.A:
            return NucleobaseType.T;
        case NucleobaseType.T:
            return NucleobaseType.A;
    }

    return _getComplementaryBaseCore(nbType);
}

/**
 * Returns complementary RNA base type
 * 
 * @param nbType source base type
 * @returns complementary nucleobase type
 */
export function getComplementaryRnaBase(nbType: RnaNucleobaseType): RnaNucleobaseType {
    switch (nbType) {
        case NucleobaseType.A:
            return NucleobaseType.U;
        case NucleobaseType.U:
            return NucleobaseType.A;
    }

    return _getComplementaryBaseCore(nbType);
}