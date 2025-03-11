/**
 * Type identifying ends of nucleic acid strand
 */
export enum NucleicAcidStrandEnd {
    FIVE_PRIME,
    THREE_PRIME
}

/**
 * Type identifying ends of amino acid chain
 */
export enum AminoAcidChainEnd {
    N_TERM,
    C_TERM
}

/**
 * Type identifying valid nucleic acid types
 */
export enum NucleicAcidType {
    DNA = "DNA",
    RNA = "RNA",
    XNA = "XNA" // Xeno nucleic acid
}

// ========================================================
// Conversions between string and enum types and vice versa
// ========================================================

/**
 * Converts given nucleic acid type to string name
 * 
 * @param naType input type
 * @returns three-letter string code
 */
export function nucleicAcidTypeToString(naType: NucleicAcidType): string {
    return naType;
}

/**
 * Converts given string to nucleic acid type
 * 
 * @param content three-letter string identifying the type of nucleic acid
 * @param fallbackType fallback type to be used if the identification fails
 * @returns identified nucleic acid type
 */
export function stringToNucleicAcidType(content: string,
    fallbackType: NucleicAcidType = NucleicAcidType.DNA): NucleicAcidType {
    if (Object.values(NucleicAcidType).some((c: string) => c === content.toUpperCase())) {
        return content as NucleicAcidType;
    }

    return fallbackType;
}