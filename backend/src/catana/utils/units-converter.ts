import { MathUtils } from "three";

export enum LengthUnits {
    A = 1,    // Angstroms
    PM = 2,   // Picometers
    NM = 3,   // Nanometers
}

export enum AngularUnits {
    RAD = 4,  // Radians
    DEG = 5,  // Degrees
}

export function stringToUnitType(content: string): LengthUnits | AngularUnits | undefined {
    const upperCaseContent = content.toUpperCase();
    return (LengthUnits as any)[upperCaseContent] ?? (AngularUnits as any)[upperCaseContent];
}

/**
 * Class serving for the conversion between different length & angular units.
 * While Catana internally works in Angstroms, this functionality is handy, for example,
 * when converting from/to file formats (e.g., UNF) allowing for different units.
 */
export class UnitsConverter {
    private readonly aToPm = 100.0;
    private readonly aToNm = 0.1;

    private _sourceUnits: LengthUnits | AngularUnits;
    private _targetUnits: LengthUnits | AngularUnits;

    public constructor(sourceUnits: LengthUnits | AngularUnits,
        targetUnits: LengthUnits | AngularUnits) {
        this._sourceUnits = sourceUnits;
        this._targetUnits = targetUnits;
    }

    public get sourceUnits(): LengthUnits | AngularUnits {
        return this._sourceUnits;
    }

    public get targetUnits(): LengthUnits | AngularUnits {
        return this._targetUnits;
    }

    public convert(value: number,
        overrideSourceUnits?: LengthUnits | AngularUnits,
        overrideTargetUnits?: LengthUnits | AngularUnits): number {
        const srcUnit = overrideSourceUnits ?? this.sourceUnits;
        const trgUnit = overrideTargetUnits ?? this.targetUnits;

        switch (srcUnit) {
            case LengthUnits.A:
                return this.lengthConv(trgUnit as LengthUnits,
                    value, 1, this.aToPm, this.aToNm);
            case LengthUnits.PM:
                return this.lengthConv(trgUnit as LengthUnits,
                    value, 1.0 / this.aToPm, 1, this.aToNm / this.aToPm);
            case LengthUnits.NM:
                return this.lengthConv(trgUnit as LengthUnits,
                    value, 1.0 / this.aToNm, this.aToPm / this.aToNm, 1);
            case AngularUnits.DEG:
                return trgUnit === AngularUnits.RAD ? MathUtils.degToRad(value) : value;
            case AngularUnits.RAD:
                return trgUnit === AngularUnits.DEG ? MathUtils.radToDeg(value) : value;
        }

        throw Error("Unknown unit!" + srcUnit);
    }

    public convertArray(values: number[],
        overrideSourceUnits?: LengthUnits | AngularUnits,
        overrideTargetUnits?: LengthUnits | AngularUnits): number[] {
        let resArray: number[] = [];

        values.forEach(val => {
            resArray.push(this.convert(val,
                overrideSourceUnits, overrideTargetUnits));
        });

        return resArray;
    }

    private lengthConv(trgUnit: LengthUnits, value: number,
        aMult: number, pmMult: number, nmMult: number): number {
        switch (trgUnit) {
            case LengthUnits.A:
                return value * aMult;
            case LengthUnits.PM:
                return value * pmMult;
            case LengthUnits.NM:
                return value * nmMult;
        }

        throw Error("Unknown length unit!" + trgUnit);
    }
}

export default UnitsConverter;