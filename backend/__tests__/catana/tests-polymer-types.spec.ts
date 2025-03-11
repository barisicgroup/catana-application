import {NucleicAcidType, nucleicAcidTypeToString, stringToNucleicAcidType} from "../../src/catana/data_model/types_declarations/polymer-types";

describe('catana/polymer-types', function () {
    it('conversions to string', function () {
        expect(nucleicAcidTypeToString(NucleicAcidType.DNA)).toBe("DNA");
        expect(nucleicAcidTypeToString(NucleicAcidType.RNA)).toBe("RNA");
        expect(nucleicAcidTypeToString(NucleicAcidType.XNA)).toBe("XNA");
    })

    it('conversions from string', function () {
        expect(stringToNucleicAcidType("DNA")).toBe(NucleicAcidType.DNA);
        expect(stringToNucleicAcidType("RNA")).toBe(NucleicAcidType.RNA);
        expect(stringToNucleicAcidType("XNA")).toBe(NucleicAcidType.XNA);
    })
})