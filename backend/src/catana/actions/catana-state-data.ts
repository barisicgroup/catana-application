
//type StateThatNeedsData = ProteinAddAminoAcidsState | ProteinMutateAminoAcidState | CgNucleicAcidExtendState | CgNucleicAcidChangeTypeState | MoveState;
interface StateThatNeedsData {
    stateDataUpdated: () => void;
}

type TransformOrientation = "global" | "local" | "principal";

/**
 * Data that may be useful for the CatanaStates
 * Upon registration of a CatanaState (with 'set state'),
 * an object of this class will notify that state when some data changes
 */
export class CatanaStateData {

    private _state: null | StateThatNeedsData;

    constructor() {
        this._state = null;
    }

    private _aaName: string;
    private _chainEndToAppendAATo: "N" | "C";
    private _ntName: string;
    private _strandEndToAppendNTTo: "5'" | "3'";
    private _changeAlsoComplementary: boolean = true;
    private _extendDoubleStrand: boolean = false;
    private _count: number;
    private _transformOrientation: TransformOrientation;

    public get aaName(): string {
        return this._aaName;
    }

    public set aaName(value: string) {
        this._aaName = value;
        this.update();
    }

    public get chainEndToAppendAATo(): "N" | "C" {
        return this._chainEndToAppendAATo;
    }

    public set chainEndToAppendAATo(value: "N" | "C") {
        this._chainEndToAppendAATo = value;
        this.update();
    }

    get ntName(): string {
        return this._ntName;
    }

    set ntName(value: string) {
        this._ntName = value;
        this.update();
    }

    get strandEndToAppendNTTo(): "5'" | "3'" {
        return this._strandEndToAppendNTTo;
    }

    set strandEndToAppendNTTo(value: "5'" | "3'") {
        this._strandEndToAppendNTTo = value;
        this.update();
    }

    public get changeAlsoComplementary(): boolean {
        return this._changeAlsoComplementary;
    }

    public set changeAlsoComplementary(value: boolean) {
        this._changeAlsoComplementary = value;
    }

    public get extendDoubleStrand(): boolean {
        return this._extendDoubleStrand;
    }

    public set extendDoubleStrand(value: boolean) {
        this._extendDoubleStrand = value;
    }

    public get count(): number {
        return this._count;
    }

    public set count(value: number) {
        this._count = value;
        this.update();
    }

    get transformOrientation(): TransformOrientation {
        return this._transformOrientation;
    }

    set transformOrientation(value: TransformOrientation) {
        this._transformOrientation = value;
        this.update();
    }

    /**
     * Get/Set the CatanaState for this object.
     * This CatanaState will then be notified (with 'CatanaState.stateDataUpdated') when a change occurs in the data
     * Note: The CatanaState must implement the method 'stateDataUpdated' to be used here
     */
    get state(): StateThatNeedsData | null {
        return this._state;
    }
    set state(value: StateThatNeedsData | null) {
        this._state = value;
    }

    public setPolymerParams(
        aaName?: string,
        chainEndToAppendTo?: "N" | "C",
        ntName?: string,
        strandEndToAppendTo?: "5'" | "3'",
        count?: number) {

        this._aaName = aaName === undefined ? this.aaName : aaName;
        this._chainEndToAppendAATo = chainEndToAppendTo || this.chainEndToAppendAATo;
        this._ntName = ntName === undefined ? this.ntName : ntName;
        this._strandEndToAppendNTTo = strandEndToAppendTo || this.strandEndToAppendNTTo;
        this._count = count === undefined ? this.count : count;
        this.update();
    }

    private update() {
        this._state?.stateDataUpdated();
    }
}

export default CatanaStateData;