/**
 * Identifies particular type/subset of structural data
 */
export enum StructureElementType {
    ATOM,
    RESIDUE,
    CHAIN
}

/**
 * Lists structure elements available in coarse-grained data model
 */
export type CgStructureElementType = StructureElementType.RESIDUE | StructureElementType.CHAIN;