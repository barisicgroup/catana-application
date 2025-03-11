import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import { NucleicAcidStrandEnd } from "../data_model/types_declarations/polymer-types";
import Command from "./command";

/**
 * This command connects two DNA strands into one in
 * the desired direction.
 */
export class ConnectNaStrandsCommand extends Command {

    private _startStrand: CgNucleicAcidStrand;
    private _connectionEnd: NucleicAcidStrandEnd;
    private _targetStrand: CgNucleicAcidStrand | null;

    private _fivePrimeProxyIdx: number;
    private _connFivePrimeNtGlobalId: number;

    constructor(startStrand: CgNucleicAcidStrand, connEnd: NucleicAcidStrandEnd,
        targetStrand: CgNucleicAcidStrand) {
        super();

        this._startStrand = startStrand;
        this._connectionEnd = connEnd;
        this._targetStrand = targetStrand;
    }

    public do() {
        if (this._targetStrand === null || this._startStrand.length === 0
            || this._targetStrand.length === 0) {
            this.error_cannotRedo();
            return;
        }

        let connFivePrimeProxy: CgNucleotideProxy;
        if (this._connectionEnd === NucleicAcidStrandEnd.FIVE_PRIME) {
            connFivePrimeProxy = this._targetStrand.threePrime!;
        } else {
            connFivePrimeProxy = this._startStrand.threePrime!;
        }

        this._fivePrimeProxyIdx = connFivePrimeProxy.index;
        this._connFivePrimeNtGlobalId = connFivePrimeProxy.globalId;

        this._startStrand.connectTo(this._targetStrand, this._connectionEnd);
        if (this._targetStrand !== this._startStrand) {
            this._targetStrand.parentStructure!.removeNaStrand(this._targetStrand);
            this._targetStrand = null;
        }
    }

    public undo() {
        if (this._startStrand.parentStructure === undefined ||
            this._startStrand.parentStructure!.naStrands.indexOf(this._startStrand) < 0 ||
            this._fivePrimeProxyIdx >= this._startStrand.length ||
            this._startStrand.getNucleotideProxy(this._fivePrimeProxyIdx)!
                .globalId !== this._connFivePrimeNtGlobalId) {
            this.error_cannotUndo();
            return;
        }

        const newStr = this._startStrand.breakAfterNucleotide(this._startStrand.getNucleotideProxy(this._fivePrimeProxyIdx)!);
        if (newStr !== undefined) {
            this._startStrand.parentStructure!.addNaStrand(newStr);

            if (newStr?.parentStructure!.parentComponent) {
                newStr.parentStructure!.parentComponent.updateRepresentations({});
            }
        }
    }

    get name(): string {
        return "Connected two DNA strands into one.";
    }
}

export default ConnectNaStrandsCommand;