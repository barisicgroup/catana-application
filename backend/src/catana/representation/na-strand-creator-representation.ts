import Representation, { RepresentationParameters } from "../../representation/representation";
import Viewer from "../../viewer/viewer";
import Buffer from "../../buffer/buffer";
import NucleicAcidStrandCreator from "../nanomodeling/nucleic-acid-strand-creator";
import { Vector3 } from "three";
import BufferCreator from "../geometry/buffer-creator";

/**
 * Representation used for rendering of nucleic acid strand creator, i.e.,
 * cylindrical object being shown when the user draws DNA strands via user interface.
 */
export class NaStrandCreatorRepresentation extends Representation {
    private _strandCreator: NucleicAcidStrandCreator;

    constructor(strandCreator: NucleicAcidStrandCreator, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(strandCreator, viewer, params);

        this._strandCreator = strandCreator;
        this.parameters = Object.assign({}, this.parameters);
        this.init(params);
    }

    public get strandCreator(): NucleicAcidStrandCreator {
        return this._strandCreator;
    }

    public init(params: Partial<RepresentationParameters>): void {
        super.init(params);
        this.type = this.getType();
        this.build();
    }

    protected getType(): string {
        return "strand-creator";
    }

    public create(): void {
        this.bufferList = this.createBuffers();
    }

    public update(what?: any): void {
        super.update(what);
    }

    public attach(callback: () => void): void {
        this.bufferList.forEach(buffer => {
            this.viewer.add(buffer);
        });

        super.attach(callback);
    }

    public clear(): void {
        super.clear();
    }

    public dispose(): void {
        super.dispose();
    }

    private createBuffers(): Buffer[] {
        const buffer = BufferCreator.createCylinderBuffer(
                this.strandCreator.helicalAxisStart,
                this.strandCreator.helicalAxisEnd,
                new Vector3(1, 1, 1),
                new Vector3(1, 1, 1),
                this.strandCreator.dnaForm.doubleHelixDiameter * 0.5);
        buffer.setMatrix(this.matrix);
        return [buffer];
    }
}

// Intentionally not added to the representation registry

export default NaStrandCreatorRepresentation;