/**
 * @file Filtering Constants
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

export enum kwd {
  PROTEIN = 1,
  NUCLEIC = 2,
  RNA = 3,
  DNA = 4,
  POLYMER = 5,
  WATER = 6,
  HELIX = 7,
  SHEET = 8,
  TURN = 9,
  BACKBONE = 10,
  SIDECHAIN = 11,
  ALL = 12,
  HETERO = 13,
  ION = 14,
  SACCHARIDE = 15,
  SUGAR = 15,
  BONDED = 16,
  RING = 17,
  AROMATICRING = 18,
  METAL = 19,
  POLARH = 20,
  NONE = 21,
  SCAFFOLD = 22,
  STAPLE = 23
}

export const FilterAllKeyword = [ '*', '', 'ALL' ]
export const FilterNoneKeyword = [ 'NONE' ]

export const AtomOnlyKeywords = [
  kwd.BACKBONE, kwd.SIDECHAIN, kwd.BONDED, kwd.RING, kwd.AROMATICRING, kwd.METAL, kwd.POLARH
]

export const ChainKeywords = [
  kwd.POLYMER, kwd.WATER
]

export const SmallResname = [ 'ALA', 'GLY', 'SER' ]
export const NucleophilicResname = [ 'CYS', 'SER', 'THR' ]
export const HydrophobicResname = [ 'ALA', 'ILE', 'LEU', 'MET', 'PHE', 'PRO', 'TRP', 'VAL' ]
export const AromaticResname = [ 'PHE', 'TRP', 'TYR', 'HIS' ]
export const AmideResname = [ 'ASN', 'GLN' ]
export const AcidicResname = [ 'ASP', 'GLU' ]
export const BasicResname = [ 'ARG', 'HIS', 'LYS' ]
export const ChargedResname = [ 'ARG', 'ASP', 'GLU', 'HIS', 'LYS' ]
export const PolarResname = [ 'ASN', 'ARG', 'ASP', 'CYS', 'GLY', 'GLN', 'GLU', 'HIS', 'LYS', 'SER', 'THR', 'TYR' ]
export const NonpolarResname = [ 'ALA', 'ILE', 'LEU', 'MET', 'PHE', 'PRO', 'TRP', 'VAL' ]
export const CyclicResname = [ 'HIS', 'PHE', 'PRO', 'TRP', 'TYR' ]
export const AliphaticResname = [ 'ALA', 'GLY', 'ILE', 'LEU', 'VAL' ]

export enum k {
  NOT,
  AND,
  OR,
  SEPARATOR,
  PAR_L, // (
  PAR_R, // )
  HYDROGEN,
  SMALL,
  NUCLEOPHILIC,
  HYDROPHOBIC,
  AROMATIC,
  AMIDE,
  ACIDIC,
  BASIC,
  CHARGED,
  POLAR,
  NONPOLAR,
  CYCLIC,
  ALIPHATIC,
  SIDECHAINATTACHED,
  APOLARH,
  LIGAND,
  ATOMLIST,
  ATOM_DEPRECATED,
  ELEMENT,
  RESLIST_START,
  RESLIST_END,
  MODEL,
  ALTLOC,
  ATOMNAME,
  CHAIN,
  INSCODE,
  INSCODE_NEGATE,
  INSCODE_NEGATE2
}

export const Keywords: {[id in k]: string} = {
  [k.NOT]: "NOT",
  [k.AND]: "AND",
  [k.OR]: "OR",
  [k.SEPARATOR]: ",",
  [k.PAR_L]: "(",
  [k.PAR_R]: ")",
  [k.HYDROGEN]: "HYDROGEN",
  [k.SMALL]: "SMALL",
  [k.NUCLEOPHILIC]: "NUCLEOPHILIC",
  [k.HYDROPHOBIC]: "HYDROPHOBIC",
  [k.AROMATIC]: "AROMATIC",
  [k.AMIDE]: "AMID",
  [k.ACIDIC]: "ACIDIC",
  [k.BASIC]: "BASIC",
  [k.CHARGED]: "CHARGED",
  [k.POLAR]: "POLAR",
  [k.NONPOLAR]: "NONPOLAR",
  [k.CYCLIC]: "CYCLIC",
  [k.ALIPHATIC]: "ALIPHATIC",
  [k.SIDECHAINATTACHED]: "SIDECHAINATTACHED",
  [k.APOLARH]: "APOLARH",
  [k.LIGAND]: "LIGAND",
  [k.ATOMLIST]: "@",
  [k.ATOM_DEPRECATED]: "#",
  [k.ELEMENT]: "_",
  [k.RESLIST_START]: "[",
  [k.RESLIST_END]: "]",
  [k.MODEL]: "/",
  [k.ALTLOC]: "%",
  [k.ATOMNAME]: ".",
  [k.CHAIN]: ":",
  [k.INSCODE]: "^",
  [k.INSCODE_NEGATE]: "-",
  [k.INSCODE_NEGATE2]: "--"
}

// From the NGL Viewer manual: http://nglviewer.org/ngl/api/manual/selection-language.html
export const KeywordDescriptions: {[id in k]: string} = {
  [k.NOT]: "'Not' logical operator (e.g.: '( not polymer or hetero ) and not ( water or ion )')",
  [k.AND]: "'And' logical operator (e.g.: '( not polymer or hetero ) and not ( water or ion )')",
  [k.OR]: "'Or' logical operator (e.g.: '( not polymer or hetero ) and not ( water or ion )')",
  [k.SEPARATOR]: "Used to separate atom lists (e.g.: @0,1,4,5,11,23,42) and residue lists (e.g.: [ALA,GLU,MET])",
  [k.PAR_L]: "Used for grouping logical expressions (e.g.: '( not polymer or hetero ) and not ( water or ion )')",
  [k.PAR_R]: "Used for grouping logical expressions (e.g.: '( not polymer or hetero ) and not ( water or ion )')",
  [k.HYDROGEN]: "",
  [k.SMALL]: "Gly or Ala or Ser",
  [k.NUCLEOPHILIC]: "Ser or Thr or Cys",
  [k.HYDROPHOBIC]: "Ala or Val or Leu or Ile or Met or Pro or Phe or Trp",
  [k.AROMATIC]: "Phe or Tyr or Trp or His",
  [k.AMIDE]: "Asn or Gln",
  [k.ACIDIC]: "Asp or Glu",
  [k.BASIC]: "His or Lys or Arg",
  [k.CHARGED]: "Asp or Glu or His or Lys or Arg",
  [k.POLAR]: "Asp or Cys or Gly or Glu or His or Lys or Arg or Asn or Gln or Ser or Thr or Tyr",
  [k.NONPOLAR]: "Ala or Ile or Leu or Met or Phe or Pro or Val or Trp",
  [k.CYCLIC]: "His or Phe or Pro or Trp or Tyr",
  [k.ALIPHATIC]: "Ala or Gly or Ile or Leu or Val",
  [k.SIDECHAINATTACHED]: "not backbone or .CA or (PRO and .N)",
  [k.APOLARH]: "", // TODO
  [k.LIGAND]: "( not polymer or hetero ) and not ( water or ion )",
  [k.ATOMLIST]: "A list of atom indices (e.g.: @0,1,4,5,11,23,42)",
  [k.ATOM_DEPRECATED]: "#", // TODO
  [k.ELEMENT]: "Element name (e.g.: '_H' or '_C' or '_O')",
  [k.RESLIST_START]: "Open a list of residues (e.g.: [ALA,GLU,MET] or numeric residue name (e.g.: '[032]' or '[1AB]')",
  [k.RESLIST_END]: "Close a list of residues (e.g.: [ALA,GLU,MET] or numeric residue name (e.g.: '[032]' or '[1AB]')",
  [k.MODEL]: "Model number (e.g.: '/0' or '/1' etc.)",
  [k.ALTLOC]: "Alternate location (e.g.: '%A' or '%B' etc. or '%' for non-alternate location atoms)",
  [k.ATOMNAME]: "Atom name (e.g.: '.CA' or '.C' or '.N' etc.)",
  [k.CHAIN]: "Chain name (e.g.: ':A')",
  [k.INSCODE]: "Insertion code (e.g.: '^A' or '^B' etc. or '^' for residues with no insertion code)",
  [k.INSCODE_NEGATE]: "", // TODO
  [k.INSCODE_NEGATE2]: "" // TODO
}

// TODO Many keywords missing here! Maybe find out what they mean and complete the list?
export const MoreKeywordDescriptions: {[id in kwd]: string} = {
  [kwd.PROTEIN]: "",
  [kwd.NUCLEIC]: "",
  [kwd.RNA]: "",
  [kwd.DNA]: "",
  [kwd.POLYMER]: "",
  [kwd.WATER]: "",
  [kwd.HELIX]: "",
  [kwd.SHEET]: "",
  [kwd.TURN]: "not helix and not sheet",
  [kwd.BACKBONE]: "",
  [kwd.SIDECHAIN]: "",
  [kwd.ALL]: "",
  [kwd.HETERO]: "",
  [kwd.ION]: "",
  [kwd.SACCHARIDE]: "",
  [kwd.SUGAR]: "",
  [kwd.BONDED]: "All atoms with at least one bond",
  [kwd.RING]: "All atoms within rings",
  [kwd.AROMATICRING]: "", // TODO?
  [kwd.METAL]: "",
  [kwd.POLARH]: "", // TODO?
  [kwd.NONE]: "",
  [kwd.SCAFFOLD]: "",
  [kwd.STAPLE]: ""
}