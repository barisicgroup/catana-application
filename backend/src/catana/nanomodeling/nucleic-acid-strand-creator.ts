import { Vector3 } from "three";
import { BDnaIdealisticForm, DnaForm } from "./dna-forms";

/**
 * This class stores information about the nucleic acid strand being created from point A to B
 * via the 3D modeling interface.
 */
export class NucleicAcidStrandCreator {
    private _helicalAxisStart: Vector3;
    private _helicalAxisEnd: Vector3;
    private _dnaForm: DnaForm;
    private _maxLengthInAngstroms: number | undefined;

    /**
     * @param startPos starting position of the new strand
     * @param endPos ending position of the new strand
     * @param dnaForm DNA form of the created strand
     * @param maxLength maximum allowed length of the strand (in nr. of nucleotides)
     */
    constructor(startPos: Vector3 = new Vector3(0, 0, 0),
        endPos: Vector3 = new Vector3(0, 0, 0),
        dnaForm: DnaForm = BDnaIdealisticForm, maxLength?: number) {

        this._helicalAxisStart = startPos;
        this._helicalAxisEnd = endPos;
        this._dnaForm = dnaForm;

        if (maxLength) {
            this._maxLengthInAngstroms = maxLength * this.nucleotideRise;
        }
    }

    /**
     * @returns start position of the created strand
     */
    public get helicalAxisStart(): Vector3 {
        return this._helicalAxisStart;
    }

    /**
     * Sets new starting position for the created strand
     */
    public set helicalAxisStart(startPos: Vector3) {
        this._helicalAxisStart.copy(startPos);
    }

    /**
     * @returns end position for the created strand
     */
    public get helicalAxisEnd(): Vector3 {
        const currUserLength = this._helicalAxisEnd.clone().distanceTo(this.helicalAxisStart);
        if (this._maxLengthInAngstroms && this._maxLengthInAngstroms < currUserLength) {
            return this._helicalAxisStart.clone().add(
                this.helicalAxisDirection.normalize().
                    multiplyScalar(this._maxLengthInAngstroms));
        }
        return this._helicalAxisEnd;
    }

    /**
     * Sets new end position for the created strand.
     * If maximum allowed length of the strand was set, the new strand end
     * will be shortened to not exceed this value.
     */
    public set helicalAxisEnd(endPos: Vector3) {
        this._helicalAxisEnd.copy(endPos);
    }

    /**
     * @returns nucleotide rise (depending on the provided DNA form)
     */
    public get nucleotideRise(): number {
        return this._dnaForm.defaultBaseParams.baseRise;
    }

    /**
     * @returns DNA form of the created strand
     */
    public get dnaForm(): DnaForm {
        return this._dnaForm;
    }

    /**
     * Sets new DNA form for the created strand
     */
    public set dnaForm(form: DnaForm) {
        this._dnaForm = form;
    }

    /**
     * @returns the direction of the helical axis
     */
    public get helicalAxisDirection(): Vector3 {
        return this._helicalAxisEnd.clone().sub(this.helicalAxisStart).normalize();
    }

    /**
     * @returns number of nucleotides to be created
     */
    public get numOfNucleotides(): number {
        return Math.round(this.lengthInAngstroms / this.nucleotideRise);
    }

    /**
     * @returns length of the strand in angstroms
     */
    public get lengthInAngstroms(): number {
        return this.helicalAxisStart.distanceTo(this.helicalAxisEnd);
    }
}

export default NucleicAcidStrandCreator;