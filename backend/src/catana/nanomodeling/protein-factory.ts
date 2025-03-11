import { MathUtils, Vector3 } from "three";
import CgAminoAcidChain from "../data_model/cg-amino-acid-chain";
import { AminoAcidType, oneLetterCodeToAminoAcidType } from "../data_model/types_declarations/monomer-types";
import { getPerpendicularVector } from "../utils/catana-utils";
import GlobalIdGenerator from "../utils/global-id-generator";

// TODO Probably needs to be refactored to use sequence providers similar to DNA creation etc...

/**
 * Class serving for creation of coarse-grained proteins
 */
class ProteinFactory {
    private _aaToHelixPref: Map<AminoAcidType, number>;
    private _aaToSheetPref: Map<AminoAcidType, number>;

    public constructor() {
        this._aaToHelixPref = this.getAaToHelixMap();
        this._aaToSheetPref = this.getAaToSheetMap();
    }

    /**
     * Builds coarse-grained peptide from the given FASTA sequence
     * 
     * @param fastaSequence one-letter sequence determining the structure to be built
     * @returns coarse-grained amino acid chain with the given sequence
     */
    public buildPeptideFromSequence(fastaSequence: string): CgAminoAcidChain | null {
        let seqArr: AminoAcidType[] = [];
        for (let i = 0; i < fastaSequence.length; ++i) {
            seqArr.push(oneLetterCodeToAminoAcidType(fastaSequence[i]));
        }

        return this.buildPeptide(new Vector3(0, 0, 0), new Vector3(1, 0, 0), seqArr);
    }

    /**
     * Builds coarse-grained peptide at the desired location in space
     * 
     * @param startPosition starting position of the peptide chain
     * @param initialDirection initial direction in which the peptide should start
     * @param sequence sequence of the peptide
     * @returns coarse-grained amino acid chain with the given sequence
     */
    public buildPeptide(startPosition: Vector3, initialDirection: Vector3, sequence: AminoAcidType[]): CgAminoAcidChain | null {
        if (sequence.length === 0) {
            return null;
        }

        const newChain = new CgAminoAcidChain(GlobalIdGenerator.generateId(), "A", undefined, sequence.length);
        const initDir = initialDirection.clone().normalize();

        if (this.shouldFormHelix(sequence)) {
            this.appendAsHelix(newChain, startPosition, initDir, sequence);
        } else {
            this.appendAsSheet(newChain, startPosition, initDir, sequence);
        }

        return newChain;
    }

    /**
     * Appends amino acids forming an alpha-helical structure
     * 
     * @param chain chain to append to
     * @param startPos starting position of the helix
     * @param initDir initial direction of the helix
     * @param seq sequence of amino acids in the helix
     */
    private appendAsHelix(chain: CgAminoAcidChain, startPos: Vector3, initDir: Vector3, seq: AminoAcidType[]): void {
        // Alpha helix geometry sources:
        // http://www.cryst.bbk.ac.uk/PPS95/course/3_geometry/helix2.html
        // https://en.wikipedia.org/wiki/Protein_secondary_structure

        const helixRise: number = 1.5;
        const helixRadius: number = 2.3;
        const helixTwist: number = (360 / 3.6) * MathUtils.DEG2RAD;
        const helicalAxis: Vector3 = initDir;
        let twistVct: Vector3 = getPerpendicularVector(initDir);

        for (let i = 0; i < seq.length; ++i) {
            let pos: Vector3 = startPos.clone().add(
                helicalAxis.clone().multiplyScalar(i * helixRise)
            ).add(
                twistVct.clone().normalize().multiplyScalar(helixRadius)
            );

            twistVct.applyAxisAngle(helicalAxis, helixTwist);

            chain.insertNewCtermAminoAcid(GlobalIdGenerator.generateId(), seq[i], pos);
        }
    }

    /**
     * Appends amino acids forming a very simplistic antiparallel beta sheet-like structure
     * 
     * @param chain chain to append to
     * @param startPos starting position of the sheet
     * @param initDir initial direction of the sheet
     * @param seq sequence of amino acids in the sheet
     */
    private appendAsSheet(chain: CgAminoAcidChain, startPos: Vector3, initDir: Vector3, seq: AminoAcidType[]): void {
        // Beta sheet geometry sources:
        // http://www.cryst.bbk.ac.uk/PPS95/course/3_geometry/sheet.html
        // http://www.cryst.bbk.ac.uk/PPS2/course/section8/ss-960531_10.html
        // https://swissmodel.expasy.org/course/text/chapter1.htm

        const axialDistance: number = 3.5;
        const strandStep: number = 25 / 6.0;
        const resPerStrand: number = 6;
        const zigZagRadius = 0.74; // Roughly computed based on amino acid dimensions ...
        let strandAxis: Vector3 = initDir.clone();
        const sheetExpansionAxis: Vector3 = getPerpendicularVector(initDir).normalize();
        let zigZagTwistVct: Vector3 = sheetExpansionAxis.clone();

        let lastPos: Vector3 = startPos.clone();
        for (let i = 0; i < seq.length; ++i) {
            if (i > 0 && i % resPerStrand === 0) {
                strandAxis.negate();
                lastPos.add(sheetExpansionAxis.clone().multiplyScalar(strandStep));
            }

            chain.insertNewCtermAminoAcid(GlobalIdGenerator.generateId(), seq[i], lastPos.clone());

            lastPos.add(
                strandAxis.clone().multiplyScalar(axialDistance)
            ).add(
                zigZagTwistVct.clone().normalize().multiplyScalar(zigZagRadius)
            );

            zigZagTwistVct.applyAxisAngle(strandAxis, Math.PI);
        }
    }

    /**
     * Checks if the given amino acid sequence should form an alpha helix or not
     * 
     * @param sequence sequence to check for
     * @returns true if this sequence tends to form an alpha helix
     */
    private shouldFormHelix(sequence: AminoAcidType[]): boolean {
        let helixPreference: number = 0;

        // This is just a simple straightforward procedure determining
        // whether the whole given sequence has statistically higher alpha helix
        // or beta sheet preference

        for (let i = 0; i < sequence.length; ++i) {
            let helPref = this._aaToHelixPref.get(sequence[i]) ?? 0;
            let sheetPref = this._aaToSheetPref.get(sequence[i]) ?? 0;

            helixPreference += helPref - sheetPref;
        }

        return helixPreference >= 0;
    }

    /**
     * @returns map storing preferences of individual amino acids to alpha helix conformation
     */
    private getAaToHelixMap(): Map<AminoAcidType, number> {
        const map = new Map<AminoAcidType, number>();

        // Source
        // https://biology.stackexchange.com/a/46538
        // http://www.bio.brandeis.edu/classes/biochem104/alpha_helix_2007.pdf

        map.set(AminoAcidType.ALA, 1.41);
        map.set(AminoAcidType.ARG, 1.21);
        map.set(AminoAcidType.ASN, 0.76);
        map.set(AminoAcidType.ASP, 0.99);
        map.set(AminoAcidType.CYS, 0.66);
        map.set(AminoAcidType.GLU, 1.59);
        map.set(AminoAcidType.GLN, 1.27);
        map.set(AminoAcidType.GLY, 0.43);
        map.set(AminoAcidType.HIS, 1.05);
        map.set(AminoAcidType.ILE, 1.09);
        map.set(AminoAcidType.LEU, 1.34);
        map.set(AminoAcidType.LYS, 1.23);
        map.set(AminoAcidType.MET, 1.3);
        map.set(AminoAcidType.PHE, 1.16);
        map.set(AminoAcidType.PRO, 0.34);
        map.set(AminoAcidType.SEC, 0.66); // SEC not in table, copied data from CYS
        map.set(AminoAcidType.SER, 0.57);
        map.set(AminoAcidType.THR, 0.76);
        map.set(AminoAcidType.TRP, 1.02);
        map.set(AminoAcidType.TYR, 0.74);
        map.set(AminoAcidType.VAL, 0.9);

        return map;
    }

    /**
    * @returns map storing preferences of individual amino acids to beta sheet conformation
    */
    private getAaToSheetMap(): Map<AminoAcidType, number> {
        const map = new Map<AminoAcidType, number>();

        // Source
        // https://biology.stackexchange.com/a/46538
        // http://www.bio.brandeis.edu/classes/biochem104/alpha_helix_2007.pdf

        map.set(AminoAcidType.ALA, 0.72);
        map.set(AminoAcidType.ARG, 0.84);
        map.set(AminoAcidType.ASN, 0.48);
        map.set(AminoAcidType.ASP, 0.39);
        map.set(AminoAcidType.CYS, 1.4);
        map.set(AminoAcidType.GLU, 0.52);
        map.set(AminoAcidType.GLN, 0.98);
        map.set(AminoAcidType.GLY, 0.58);
        map.set(AminoAcidType.HIS, 0.8);
        map.set(AminoAcidType.ILE, 1.67);
        map.set(AminoAcidType.LEU, 1.22);
        map.set(AminoAcidType.LYS, 0.69);
        map.set(AminoAcidType.MET, 1.14);
        map.set(AminoAcidType.PHE, 1.33);
        map.set(AminoAcidType.PRO, 0.31);
        map.set(AminoAcidType.SEC, 1.4);  // SEC not in table, copied data from CYS
        map.set(AminoAcidType.SER, 0.96);
        map.set(AminoAcidType.THR, 1.17);
        map.set(AminoAcidType.TRP, 1.35);
        map.set(AminoAcidType.TYR, 1.45);
        map.set(AminoAcidType.VAL, 1.87);

        return map;
    }
}

export default ProteinFactory;