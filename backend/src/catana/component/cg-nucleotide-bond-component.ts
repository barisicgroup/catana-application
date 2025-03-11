import Component, { ComponentParameters } from "../../component/component";
import RepresentationElement from "../../component/representation-element";
import Stage from "../../stage/stage";
import CgNucleotideBondProxy from "../data_model/proxy/cg-nucleotide-bond-proxy";
import Colormaker from "../../color/colormaker";

/**
 * Component used for purposes of creation user-defined nucleotide bonds (e.g., when connecting one strand to another).
 */
export class CgNucleotideBondComponent extends Component {
    constructor(stage: Stage, nucleotideBond: CgNucleotideBondProxy, params: Partial<ComponentParameters> = {}) {
        super(stage, nucleotideBond, Object.assign({ backendOnly: true }, params));
    }

    public get nucleotideBondProxy(): CgNucleotideBondProxy {
        return this.object as CgNucleotideBondProxy;
    }

    get type(): string {
        return "cg-nucleotide-bond";
    }

    public addRepresentation(type: any, params?: any): RepresentationElement {
        return this._addRepresentation(type, this.nucleotideBondProxy, params);
    }

    public updateRepresentations(what: any) {
        super.updateRepresentations(what);
    }

    public supportsColorScheme(scheme: any): boolean {
        const p = scheme.prototype;
        return !(p && p instanceof Colormaker) || !!p.monomerBondColor;
    }
}