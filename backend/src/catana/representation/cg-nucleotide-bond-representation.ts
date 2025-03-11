import Representation, { RepresentationParameters } from "../../representation/representation";
import Viewer from "../../viewer/viewer";
import CgNucleotideBondProxy from "../data_model/proxy/cg-nucleotide-bond-proxy";
import Buffer from "../../buffer/buffer";
import BufferCreator from "../geometry/buffer-creator";
import { MonomerRepresentationConstants } from "./structure/cg-structure-monomer-representation";

/**
 * Representation used when rendering helper objects, such as connection gizmos.
 */
export class CgNucleotideBondRepresentation extends Representation {
    private _nucleotideBond: CgNucleotideBondProxy;

    constructor(nucleotideBond: CgNucleotideBondProxy, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(nucleotideBond, viewer, params);

        this._nucleotideBond = nucleotideBond;
        this.parameters = Object.assign({}, this.parameters);
        this.init(params);
    }

    public get nucleotideBond(): CgNucleotideBondProxy {
        return this._nucleotideBond;
    }

    public init(params: Partial<RepresentationParameters>): void {
        super.init(params);
        this.type = this.getType();
        this.build();
    }

    protected getType(): string {
        return "nucleotide-bond";
    }

    public create(): void {
        this.bufferList = this.createBuffers();
    }

    public update(what?: any): void {
        // TODO tailor the 'what' parameter
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
        const buffers = new Array<Buffer>(1);

        const positions = this.nucleotideBond.positionsWorld;

        const position1 = new Float32Array(positions[0].toArray());
        const position2 = new Float32Array(positions[1].toArray());
        const color1 = new Float32Array([1, 1, 1]);
        const color2 = color1;
        const radius = new Float32Array([MonomerRepresentationConstants.STICK_RADIUS]);

        buffers[0] = BufferCreator.createCylinderStripBufferFromArrays(
            position1, position2, color1, color2, radius, undefined, undefined, undefined, 0.5);

        return buffers;
    }
}

// Intentionally not added to the representation registry

export default CgNucleotideBondRepresentation;