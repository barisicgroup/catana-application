import { CatanaState } from "../actions/catana-state"
import Stage from "../../stage/stage";
import CgStructure from "../data_model/cg-structure";
import GlobalIdGenerator from "./global-id-generator";
import MultiObjectsStorage from "./multi-objects-storage";
import { Log } from "../../globals";
import StructureComponent from "../../component/structure-component";
import CgStructureComponent from "../component/cg-structure-component";
import Filter from "../../filtering/filter";
import { monomerTypeToOneLetterCode } from "../data_model/types_declarations/monomer-types";
import { Component } from "../../catana";

export const PROTEIN_VALUES_THREE_LETTER = [
    "ALA", "ARG", "ASN", "ASP",
    "CYS", "GLU", "GLN", "GLY",
    "HIS", "ILE", "LEU", "LYS",
    "MET", "PHE", "PRO", "SER",
    "THR", "TRP", "TYR", "VAL"];
//const PROTEIN_VALUES_THREE_LETTER_REGEX = new RegExp(PROTEIN_VALUES_THREE_LETTER.join("|"), "g");
/*export function isSequenceThreeLetter(s: string): boolean {
    if (s.length < 3 || s.length % 3 !== 0) return false;
    const aminoAcids = s.match(/.{3}/g) || [];
    for (const aa of aminoAcids) {
        const index = PROTEIN_VALUES_THREE_LETTER.indexOf(aa.toUpperCase());
        if (index === -1) return false;
    }
    return true;
}*/

export const PROTEIN_VALUES_ONE_LETTER = [
    "A", "R", "N", "D", "C", "E", "Q", "G", "H", "I", "L", "K", "M", "F", "P", "S", "T", "W", "Y", "V"
];
const PROTEIN_VALUES_ONE_LETTER_REGEX = new RegExp("[" + PROTEIN_VALUES_ONE_LETTER.join("") + "]", "g");
function isSequenceOneLetter(s: string) { return (s.match(PROTEIN_VALUES_ONE_LETTER_REGEX) || []).length === s.length; }

export const DNA_VALUES = ["C", "A", "T", "G"];
const DNA_VALUES_REGEX = new RegExp("[" + DNA_VALUES.join("|") + "]", "g");
function isSequenceDna(s: string) { return (s.match(DNA_VALUES_REGEX) || []).length === s.length; }

/**
 * Based on the given FASTA sequence, create a new component that has this sequence
 * @param sequence The sequence that defines the component to be created.
 * The type of component is auto-detected from the sequence if not overriden by the parameters.
 * @param stage stage instance
 * @param params parameters providing additional information to the function
 * @returns true if the component was successfully added, false otherwise
 */
export function addComponentFromSequence(sequence: string, stage: Stage,
    params: Partial<{ dnaDoubleStranded: boolean, compType: "dna" | "protein" | "unknown" }> = {}): Component | undefined {
    const dnaDs = params.dnaDoubleStranded ?? false;
    let newCgStructure: CgStructure;
    let component: Component;

    switch (params.compType ?? getSequenceType(sequence)) {
        case "dna":
            const newHelix = CatanaState.dnaFactory.buildHelixFromSequence(sequence);

            if (!newHelix) {
                Log.error("Failed to build DNA strand from sequence.");
                return undefined;
            }

            newCgStructure = new CgStructure(GlobalIdGenerator.generateId(), "DNA_" + stage.compList.length);
            newCgStructure.addNaStrand(newHelix);

            if (dnaDs) {
                const comp = CatanaState.dnaFactory.buildComplementaryHelix(newHelix);
                if (comp) {
                    newCgStructure.addNaStrand(comp);
                }
                else {
                    Log.error("Failed to build complementary DNA strand from sequence. Continuing with only main strand...");
                    return undefined;
                }
            }

            component = stage.addComponentFromObject(new MultiObjectsStorage([newCgStructure]))[0];
            stage.defaultFileRepresentation(component);

            return component;
        case "protein":
            if (!isSequenceOneLetter(sequence)) {
                let seq = threeLetterToOneLetter(sequence);
                if (seq) {
                    sequence = seq
                } else {
                    Log.error("Protein sequence seems incorrect!");
                }
            }

            const newChain = CatanaState.proteinFactory.buildPeptideFromSequence(sequence);

            if (!newChain) {
                Log.error("Failed to build amino acid chain from sequence.");
                return undefined;
            }

            newCgStructure = new CgStructure(GlobalIdGenerator.generateId(), "Peptide_" + stage.compList.length);
            newCgStructure.addAaChain(newChain);

            component = stage.addComponentFromObject(new MultiObjectsStorage([newCgStructure]))[0];
            stage.defaultFileRepresentation(component);

            return component;
        default:
            Log.error("No component could be created from provided sequence. " +
                "This feature is only supported for DNA and protein sequences at the moment");
    }

    return undefined;
}

/**
 * Finds out the type of amino acid sequence ('three-letter', 'one-letter', 'invalid') from a given sequence string
 * @param sequence The sequence whose type we want to know
 * @returns string determining the type of sequence we detected
 */
export function getAminoAcidSequenceType(sequence: string): "three-letter" | "one-letter" | "invalid" {
    if (sequence.length >= 3 && sequence.length % 3 === 0) {
        // Split sequence into arrays of length 3
        // https://stackoverflow.com/questions/6259515/how-can-i-split-a-string-into-segments-of-n-characters
        const aminoAcids = sequence.match(/.{3}/g) || [];
        let threeLetter = true;
        for (let aa of aminoAcids) {
            const index = PROTEIN_VALUES_THREE_LETTER.indexOf(aa.toUpperCase());
            if (index === -1) {
                threeLetter = false;
                break;
            }
        }
        if (threeLetter) return "three-letter";
    }
    if (isSequenceOneLetter(sequence)) {
        return "one-letter";
    } else {
        return "invalid";
    }
}

/**
 * Converts a sequence from three-letter type to one-letter type
 * @returns converted sequence, or null if some of the elements in the source sequence was not recognized
 */
export function threeLetterToOneLetter(sequence: string): null | string {
    let newSequence = "";
    const aminoAcids = sequence.match(/.{3}/g) || [];
    for (const aa of aminoAcids) {
        const index = PROTEIN_VALUES_THREE_LETTER.indexOf(aa.toUpperCase());
        if (index === -1) return null;
        newSequence += PROTEIN_VALUES_ONE_LETTER[index];
    }
    return newSequence;
}

/**
 * Converts a sequence in one-letter type to one-letter type
 * @returns converted sequence, or null if some of the elements in the source sequence was not recognized
 */
export function oneLetterToThreeLetter(oneLetter: string): null | string {
    let newSequence = "";
    for (let i = 0; i < oneLetter.length; ++i) {
        const aa = oneLetter.charAt(i);
        const index = PROTEIN_VALUES_ONE_LETTER.indexOf(aa.toUpperCase());
        if (index === -1) return null;
        newSequence += PROTEIN_VALUES_THREE_LETTER[index];
    }
    return newSequence;
}

/**
 * Finds out whether the given sequence is a "dna", "protein", or "unknown" sequence
 * 
 * @param sequence sequence to check
 * @returns string defining the detected type of sequence
 */
function getSequenceType(sequence: string): "dna" | "protein" | "unknown" {
    if (sequence.length >= 3 && sequence.length % 3 === 0) {
        let protein = true;
        // Split sequence into arrays of length 3
        // https://stackoverflow.com/questions/6259515/how-can-i-split-a-string-into-segments-of-n-characters
        const aminoAcids = sequence.match(/.{3}/g) || [];
        for (let aa of aminoAcids) {
            const index = PROTEIN_VALUES_THREE_LETTER.indexOf(aa.toUpperCase());
            if (index === -1) {
                protein = false;
                break;
            }
        }
        if (protein) return "protein";
    }

    if (isSequenceDna(sequence)) {
        return "dna";
    } else if (isSequenceOneLetter(sequence)) {
        return "protein";
    } else {
        return "unknown";
    }
}

/**
 * Creates a FASTA string based on the given component
 * 
 * @param comp component which sequences should be exported
 * @returns FASTA-formatted string
 */
export function getFastaRecordForStructure(comp: StructureComponent | CgStructureComponent): string {
    let result = "";

    if (comp instanceof StructureComponent) {
        comp.structure.eachChain(cp => {
            let seq = "";

            cp.eachResidue(rp => {
                seq += rp.getResname1();
            }, new Filter("protein or DNA or RNA"));

            if (seq.length > 0) {
                result += getFastaHeaderLine(comp.structure.name, cp.chainname, cp.residueCount);
                result += seq;
                result += "\n";
            }
        });
    } else {
        comp.cgStructure.forEachPolymer(pol => {
            result += getFastaHeaderLine(comp.cgStructure.name, pol.name, pol.length);
            pol.sequence.forEach(mt => {
                result += monomerTypeToOneLetterCode(mt);
            });
            result += "\n";
        });
    }

    return result;
}

/**
 * Returns FASTA-formatted header string for the given inputs
 */
function getFastaHeaderLine(strucName: string, chainName: string, chainLen: number) {
    return ">" + strucName + "|Chain " + chainName + "|Len " + chainLen + "\n";
}


