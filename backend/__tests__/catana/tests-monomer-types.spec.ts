import { AminoAcidType, aminoAcidTypeToThreeLetterCode, getComplementaryBase, monomerTypeToOneLetterCode, NucleobaseType, nucleobaseTypeToPdbResidueCode, oneLetterCodeToAminoAcidType, oneLetterCodeToNucleobaseType, pdbResidueCodeToNucleobaseType, threeLetterCodeToAminoAcidType } from "../../src/catana/data_model/types_declarations/monomer-types";
import { NucleicAcidType } from "../../src/catana/data_model/types_declarations/polymer-types";

describe('catana/monomer-types', function () {
    it('conversions to string', function () {
        expect(monomerTypeToOneLetterCode(NucleobaseType.A)).toBe("A");
        expect(monomerTypeToOneLetterCode(NucleobaseType.T)).toBe("T");
        expect(monomerTypeToOneLetterCode(NucleobaseType.C)).toBe("C");
        expect(monomerTypeToOneLetterCode(NucleobaseType.G)).toBe("G");
        expect(monomerTypeToOneLetterCode(NucleobaseType.U)).toBe("U");
        expect(monomerTypeToOneLetterCode(NucleobaseType.ANY)).toBe("N");

        expect(monomerTypeToOneLetterCode(AminoAcidType.ALA)).toBe("A");
        expect(monomerTypeToOneLetterCode(AminoAcidType.ARG)).toBe("R");
        expect(monomerTypeToOneLetterCode(AminoAcidType.ASN)).toBe("N");
        expect(monomerTypeToOneLetterCode(AminoAcidType.ASP)).toBe("D");
        expect(monomerTypeToOneLetterCode(AminoAcidType.CYS)).toBe("C");
        expect(monomerTypeToOneLetterCode(AminoAcidType.GLU)).toBe("E");
        expect(monomerTypeToOneLetterCode(AminoAcidType.GLN)).toBe("Q");
        expect(monomerTypeToOneLetterCode(AminoAcidType.GLY)).toBe("G");
        expect(monomerTypeToOneLetterCode(AminoAcidType.HIS)).toBe("H");
        expect(monomerTypeToOneLetterCode(AminoAcidType.ILE)).toBe("I");
        expect(monomerTypeToOneLetterCode(AminoAcidType.LEU)).toBe("L");
        expect(monomerTypeToOneLetterCode(AminoAcidType.LYS)).toBe("K");
        expect(monomerTypeToOneLetterCode(AminoAcidType.MET)).toBe("M");
        expect(monomerTypeToOneLetterCode(AminoAcidType.PHE)).toBe("F");
        expect(monomerTypeToOneLetterCode(AminoAcidType.PRO)).toBe("P");
        expect(monomerTypeToOneLetterCode(AminoAcidType.SER)).toBe("S");
        expect(monomerTypeToOneLetterCode(AminoAcidType.THR)).toBe("T");
        expect(monomerTypeToOneLetterCode(AminoAcidType.TRP)).toBe("W");
        expect(monomerTypeToOneLetterCode(AminoAcidType.TYR)).toBe("Y");
        expect(monomerTypeToOneLetterCode(AminoAcidType.VAL)).toBe("V");
        expect(monomerTypeToOneLetterCode(AminoAcidType.ANY)).toBe("X");

        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ALA)).toBe("ALA");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ARG)).toBe("ARG");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ASN)).toBe("ASN");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ASP)).toBe("ASP");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.CYS)).toBe("CYS");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.GLU)).toBe("GLU");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.GLN)).toBe("GLN");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.GLY)).toBe("GLY");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.HIS)).toBe("HIS");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ILE)).toBe("ILE");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.LEU)).toBe("LEU");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.LYS)).toBe("LYS");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.MET)).toBe("MET");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.PHE)).toBe("PHE");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.PRO)).toBe("PRO");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.SER)).toBe("SER");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.THR)).toBe("THR");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.TRP)).toBe("TRP");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.TYR)).toBe("TYR");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.VAL)).toBe("VAL");
        expect(aminoAcidTypeToThreeLetterCode(AminoAcidType.ANY)).toBe("ANY");

        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.A, NucleicAcidType.DNA)).toBe("DA");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.T, NucleicAcidType.DNA)).toBe("DT");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.C, NucleicAcidType.DNA)).toBe("DC");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.G, NucleicAcidType.DNA)).toBe("DG");

        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.A, NucleicAcidType.RNA)).toBe("A");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.U, NucleicAcidType.RNA)).toBe("U");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.C, NucleicAcidType.RNA)).toBe("C");
        expect(nucleobaseTypeToPdbResidueCode(NucleobaseType.G, NucleicAcidType.RNA)).toBe("G");
    })

    it('conversions from string', function () {
        expect(oneLetterCodeToNucleobaseType("A")).toBe(NucleobaseType.A);
        expect(oneLetterCodeToNucleobaseType("T")).toBe(NucleobaseType.T);
        expect(oneLetterCodeToNucleobaseType("C")).toBe(NucleobaseType.C);
        expect(oneLetterCodeToNucleobaseType("G")).toBe(NucleobaseType.G);
        expect(oneLetterCodeToNucleobaseType("U")).toBe(NucleobaseType.U);
        expect(oneLetterCodeToNucleobaseType("N")).toBe(NucleobaseType.ANY);

        expect(oneLetterCodeToAminoAcidType("A")).toBe(AminoAcidType.ALA);
        expect(oneLetterCodeToAminoAcidType("R")).toBe(AminoAcidType.ARG);
        expect(oneLetterCodeToAminoAcidType("N")).toBe(AminoAcidType.ASN);
        expect(oneLetterCodeToAminoAcidType("D")).toBe(AminoAcidType.ASP);
        expect(oneLetterCodeToAminoAcidType("C")).toBe(AminoAcidType.CYS);
        expect(oneLetterCodeToAminoAcidType("E")).toBe(AminoAcidType.GLU);
        expect(oneLetterCodeToAminoAcidType("Q")).toBe(AminoAcidType.GLN);
        expect(oneLetterCodeToAminoAcidType("G")).toBe(AminoAcidType.GLY);
        expect(oneLetterCodeToAminoAcidType("H")).toBe(AminoAcidType.HIS);
        expect(oneLetterCodeToAminoAcidType("I")).toBe(AminoAcidType.ILE);
        expect(oneLetterCodeToAminoAcidType("L")).toBe(AminoAcidType.LEU);
        expect(oneLetterCodeToAminoAcidType("K")).toBe(AminoAcidType.LYS);
        expect(oneLetterCodeToAminoAcidType("M")).toBe(AminoAcidType.MET);
        expect(oneLetterCodeToAminoAcidType("F")).toBe(AminoAcidType.PHE);
        expect(oneLetterCodeToAminoAcidType("P")).toBe(AminoAcidType.PRO);
        expect(oneLetterCodeToAminoAcidType("S")).toBe(AminoAcidType.SER);
        expect(oneLetterCodeToAminoAcidType("T")).toBe(AminoAcidType.THR);
        expect(oneLetterCodeToAminoAcidType("W")).toBe(AminoAcidType.TRP);
        expect(oneLetterCodeToAminoAcidType("Y")).toBe(AminoAcidType.TYR);
        expect(oneLetterCodeToAminoAcidType("V")).toBe(AminoAcidType.VAL);
        expect(oneLetterCodeToAminoAcidType("X")).toBe(AminoAcidType.ANY);

        expect(threeLetterCodeToAminoAcidType("ALA")).toBe(AminoAcidType.ALA);
        expect(threeLetterCodeToAminoAcidType("ARG")).toBe(AminoAcidType.ARG);
        expect(threeLetterCodeToAminoAcidType("ASN")).toBe(AminoAcidType.ASN);
        expect(threeLetterCodeToAminoAcidType("ASP")).toBe(AminoAcidType.ASP);
        expect(threeLetterCodeToAminoAcidType("CYS")).toBe(AminoAcidType.CYS);
        expect(threeLetterCodeToAminoAcidType("GLU")).toBe(AminoAcidType.GLU);
        expect(threeLetterCodeToAminoAcidType("GLN")).toBe(AminoAcidType.GLN);
        expect(threeLetterCodeToAminoAcidType("GLY")).toBe(AminoAcidType.GLY);
        expect(threeLetterCodeToAminoAcidType("HIS")).toBe(AminoAcidType.HIS);
        expect(threeLetterCodeToAminoAcidType("ILE")).toBe(AminoAcidType.ILE);
        expect(threeLetterCodeToAminoAcidType("LEU")).toBe(AminoAcidType.LEU);
        expect(threeLetterCodeToAminoAcidType("LYS")).toBe(AminoAcidType.LYS);
        expect(threeLetterCodeToAminoAcidType("MET")).toBe(AminoAcidType.MET);
        expect(threeLetterCodeToAminoAcidType("PHE")).toBe(AminoAcidType.PHE);
        expect(threeLetterCodeToAminoAcidType("PRO")).toBe(AminoAcidType.PRO);
        expect(threeLetterCodeToAminoAcidType("SER")).toBe(AminoAcidType.SER);
        expect(threeLetterCodeToAminoAcidType("THR")).toBe(AminoAcidType.THR);
        expect(threeLetterCodeToAminoAcidType("TRP")).toBe(AminoAcidType.TRP);
        expect(threeLetterCodeToAminoAcidType("TYR")).toBe(AminoAcidType.TYR);
        expect(threeLetterCodeToAminoAcidType("VAL")).toBe(AminoAcidType.VAL);
        expect(threeLetterCodeToAminoAcidType("ANY")).toBe(AminoAcidType.ANY);

        expect(pdbResidueCodeToNucleobaseType("DA")).toBe(NucleobaseType.A);
        expect(pdbResidueCodeToNucleobaseType("DT")).toBe(NucleobaseType.T);
        expect(pdbResidueCodeToNucleobaseType("DC")).toBe(NucleobaseType.C);
        expect(pdbResidueCodeToNucleobaseType("DG")).toBe(NucleobaseType.G);

        expect(pdbResidueCodeToNucleobaseType("A")).toBe(NucleobaseType.A);
        expect(pdbResidueCodeToNucleobaseType("U")).toBe(NucleobaseType.U);
        expect(pdbResidueCodeToNucleobaseType("C")).toBe(NucleobaseType.C);
        expect(pdbResidueCodeToNucleobaseType("G")).toBe(NucleobaseType.G);
    })

    it('complementarity', function () {
        expect(getComplementaryBase(NucleobaseType.A, NucleicAcidType.DNA)).toBe(NucleobaseType.T);
        expect(getComplementaryBase(NucleobaseType.T, NucleicAcidType.DNA)).toBe(NucleobaseType.A);
        expect(getComplementaryBase(NucleobaseType.C, NucleicAcidType.DNA)).toBe(NucleobaseType.G);
        expect(getComplementaryBase(NucleobaseType.G, NucleicAcidType.DNA)).toBe(NucleobaseType.C);
        expect(getComplementaryBase(NucleobaseType.T, NucleicAcidType.DNA)).toBe(NucleobaseType.A);
        expect(getComplementaryBase(NucleobaseType.A, NucleicAcidType.DNA)).toBe(NucleobaseType.T);
        expect(getComplementaryBase(NucleobaseType.G, NucleicAcidType.DNA)).toBe(NucleobaseType.C);
        expect(getComplementaryBase(NucleobaseType.C, NucleicAcidType.DNA)).toBe(NucleobaseType.G);
        expect(getComplementaryBase(NucleobaseType.A, NucleicAcidType.RNA)).toBe(NucleobaseType.U);
        expect(getComplementaryBase(NucleobaseType.U, NucleicAcidType.RNA)).toBe(NucleobaseType.A);
        expect(getComplementaryBase(NucleobaseType.C, NucleicAcidType.RNA)).toBe(NucleobaseType.G);
        expect(getComplementaryBase(NucleobaseType.G, NucleicAcidType.RNA)).toBe(NucleobaseType.C);
        expect(getComplementaryBase(NucleobaseType.U, NucleicAcidType.RNA)).toBe(NucleobaseType.A);
        expect(getComplementaryBase(NucleobaseType.A, NucleicAcidType.RNA)).toBe(NucleobaseType.U);
        expect(getComplementaryBase(NucleobaseType.G, NucleicAcidType.RNA)).toBe(NucleobaseType.C);
        expect(getComplementaryBase(NucleobaseType.C, NucleicAcidType.RNA)).toBe(NucleobaseType.G);
    })
})