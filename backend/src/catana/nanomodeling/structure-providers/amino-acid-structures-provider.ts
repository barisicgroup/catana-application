import PdbParser from "../../../parser/pdb-parser";
import StringStreamer from "../../../streamer/string-streamer";
import Structure from "../../../structure/structure";
import { AminoAcidType, threeLetterCodeToAminoAcidType } from "../../data_model/types_declarations/monomer-types";

import alaPdbString from "./pdb_structures/amino_acids/ala.pdb";
import argPdbString from "./pdb_structures/amino_acids/arg.pdb";
import asnPdbString from "./pdb_structures/amino_acids/asn.pdb";
import aspPdbString from "./pdb_structures/amino_acids/asp.pdb";
import cysPdbString from "./pdb_structures/amino_acids/cys.pdb";
import glnPdbString from "./pdb_structures/amino_acids/gln.pdb";
import gluPdbString from "./pdb_structures/amino_acids/glu.pdb";
import glyPdbString from "./pdb_structures/amino_acids/gly.pdb";
import hisPdbString from "./pdb_structures/amino_acids/his.pdb";
import ilePdbString from "./pdb_structures/amino_acids/ile.pdb";
import leuPdbString from "./pdb_structures/amino_acids/leu.pdb";
import lysPdbString from "./pdb_structures/amino_acids/lys.pdb";
import metPdbString from "./pdb_structures/amino_acids/met.pdb";
import phePdbString from "./pdb_structures/amino_acids/phe.pdb";
import proPdbString from "./pdb_structures/amino_acids/pro.pdb";
import secPdbString from "./pdb_structures/amino_acids/sec.pdb";
import serPdbString from "./pdb_structures/amino_acids/ser.pdb";
import thrPdbString from "./pdb_structures/amino_acids/thr.pdb";
import trpPdbString from "./pdb_structures/amino_acids/trp.pdb";
import tyrPdbString from "./pdb_structures/amino_acids/tyr.pdb";
import valPdbString from "./pdb_structures/amino_acids/val.pdb";

export const AminoAcidsPdbsContent: { [k: string]: string } = {
    "ALA": alaPdbString,
    "ARG": argPdbString,
    "ASN": asnPdbString,
    "ASP": aspPdbString,
    "CYS": cysPdbString,
    "GLN": glnPdbString,
    "GLU": gluPdbString,
    "GLY": glyPdbString,
    "HIS": hisPdbString,
    "ILE": ilePdbString,
    "LEU": leuPdbString,
    "LYS": lysPdbString,
    "MET": metPdbString,
    "PHE": phePdbString,
    "PRO": proPdbString,
    "SEC": secPdbString,
    "SER": serPdbString,
    "THR": thrPdbString,
    "TRP": trpPdbString,
    "TYR": tyrPdbString,
    "VAL": valPdbString,
}

/**
 * Map returning reference to all-atom structure for the provided amino acid type
 */
export type AminoAcidStructuresMap = Map<AminoAcidType, Structure>;

/**
 * Class providing reference structures for individiual amino acid types
 */
export class AminoAcidStructuresProvider {
    /** 
     * If the user request a structure for undefined amino acid (which can bear any type),
     * the value of this variable is retrieved
     */
    private static readonly _aaTypeForAny: AminoAcidType = AminoAcidType.LEU;

    private static _aminoAcids: AminoAcidStructuresMap =
        new Map<AminoAcidType, Structure>();

    private static _aminoAcidCodes: string[] = [];

    /**
    * Returns map storing the reference amino acid structures.
    * It is up to the caller to ensure that the map has been already properly initialized.
    */
    public static get aminoAcids(): AminoAcidStructuresMap {
        return this._aminoAcids;
    }

    /**
    * Starts the process of loading the reference amino acid atomistic structures
    * 
    * @returns promise which resolves after the structures are loaded and reference data are computed
    */
    public static loadAminoAcids(): Promise<AminoAcidStructuresMap> {
        return new Promise<AminoAcidStructuresMap>((resolve, reject) => {
            this.loadStructuresFromFiles().then(
                (aasm: AminoAcidStructuresMap) => resolve(aasm),
                (e) => reject(e));
        });
    }

    /**
    * Loads reference structures, removes hydrogen atoms,
    * and resolves with a map of amino acid structures.
    */
    private static loadStructuresFromFiles(): Promise<AminoAcidStructuresMap> {
        if (this._aminoAcidCodes.length === 0) {
            for (let aaType in AminoAcidType) {
                if (threeLetterCodeToAminoAcidType(aaType) !== AminoAcidType.ANY) {
                    this._aminoAcidCodes.push(aaType);
                }
            }
        }

        return new Promise<AminoAcidStructuresMap>((resolve, reject) => {
            if (this.aminoAcids.size === this._aminoAcidCodes.length + 1) {
                resolve(this.aminoAcids);
            } else {
                this.aminoAcids.clear();

                const promises: Array<Promise<Structure>> = [];
                for (let i in this._aminoAcidCodes) {
                    let streamer = new StringStreamer(AminoAcidsPdbsContent[this._aminoAcidCodes[i]]);
                    promises.push(new PdbParser(streamer).parse());
                }

                Promise.all(promises).then((structures: Structure[]) => {
                    for (let i = 0; i < structures.length; ++i) {
                        structures[i].removeElements("H");

                        this.aminoAcids.set(
                            threeLetterCodeToAminoAcidType(this._aminoAcidCodes[i]),
                            structures[i]);
                    }

                    this.aminoAcids.set(AminoAcidType.ANY, this.aminoAcids.get(this._aaTypeForAny)!);

                    resolve(this.aminoAcids);
                },
                    e => reject(e));
            }
        });
    }
}