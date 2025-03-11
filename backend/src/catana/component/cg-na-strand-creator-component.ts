import Annotation from "../../component/annotation";
import Component, { ComponentParameters } from "../../component/component";
import RepresentationElement from "../../component/representation-element";
import Stage from "../../stage/stage";
import NucleicAcidStrandCreator from "../nanomodeling/nucleic-acid-strand-creator";

/**
 * Component used for purposes of strand creation via user interface.
 */
export class NaStrandCreatorComponent extends Component {
    private _annotation : Annotation;
    
    constructor(stage: Stage, naStrandCreator: NucleicAcidStrandCreator,
        params: Partial<ComponentParameters> = {}) {
        super(stage, naStrandCreator, Object.assign({ backendOnly: true }, params));

        this._annotation = this.addAnnotation(naStrandCreator.helicalAxisEnd, "", {
            applyFog: false
        });
    }

    public get strandCreator(): NucleicAcidStrandCreator {
        return this.object as NucleicAcidStrandCreator;
    }

    public get type(): string {
        return "na-strand-creator";
    }

    public addRepresentation(type: any, params?: any): RepresentationElement {
        return this._addRepresentation(type, this.strandCreator, params);
    }

    public updateRepresentations(what: any) {
        super.updateRepresentations(what);
    }

    public updateAnnotation(overrideText?: string) {
        this._annotation.clearContent();
        this._annotation.setPosition(this.strandCreator.helicalAxisEnd);
        this._annotation.setContent(overrideText ?? ("nucleotides: " + this.strandCreator.numOfNucleotides));
    }

    public supportsColorScheme(scheme: any): boolean {
        return false;
    }
}