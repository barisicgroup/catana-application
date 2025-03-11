import Representation, { RepresentationParameters } from "../../representation/representation";
import Viewer from "../../viewer/viewer";
import { SquareLattice } from "../nanomodeling/lattices/square-lattice";
import { Lattice } from "../nanomodeling/lattices/lattice";
import Buffer from "../../buffer/buffer";
import { Color, Vector3 } from "three";
import BufferCreator from "../geometry/buffer-creator";
import { LatticeCellPicker } from "../picker/lattice-picker";

interface LatticeRepresentationParameters extends RepresentationParameters { }

class LatticeRepresentation extends Representation {
    private _lattice: Lattice;

    constructor(lattice: Lattice, viewer: Viewer, params: Partial<LatticeRepresentationParameters>) {
        super(lattice, viewer, params)

        this._lattice = lattice;

        this.init(params);
    }

    init(params: Partial<LatticeRepresentationParameters>) {
        super.init(params);
        this.build();
    }

    create() {
        this.bufferList = this.createLattice();
    }

    attach(callback: () => void) {
        this.bufferList.forEach(buffer => {
            this.viewer.add(buffer);
        });

        super.attach(callback);
    }

    clear() {
        super.clear();
    }

    dispose() {
        super.dispose();
    }

    private createLattice(): Buffer[] {
        const sphereRadius = this._lattice.cellDiameter * 0.5;
        return this._lattice instanceof SquareLattice
            ? this.createSquareLattice(sphereRadius)
            : this.createHoneycombLattice(sphereRadius);
    }

    private createSquareLattice(sphereRadius: number): Buffer[] {
        let buffers: Array<Buffer> = new Array<Buffer>(1);

        const w = this._lattice.width;
        const h = this._lattice.height;
        const numOfCells = w * h;

        let spheres = {
            position: new Float32Array(numOfCells * 3),
            color: new Float32Array(numOfCells * 3),
            radius: new Float32Array(numOfCells),
            picking: new Uint32Array(numOfCells),
        }

        const color = new Color(1, 1, 1);
        let pos: Vector3;
        let spherei = 0, spherei3 = 0;

        for (let rowi = 0; rowi < h; ++rowi) {
            for (let coli = 0; coli < w; ++coli) {
                pos = this._lattice.getPosition(rowi, coli, 0, false);
                spheres.position[spherei3] = pos.x;
                spheres.position[spherei3 + 1] = pos.y;
                spheres.position[spherei3 + 2] = pos.z;

                spheres.color[spherei3] = color.r;
                spheres.color[spherei3 + 1] = color.g;
                spheres.color[spherei3 + 2] = color.b;

                spheres.radius[spherei] = sphereRadius;
                spheres.picking[spherei] = this._lattice.getIndex(rowi, coli);

                ++spherei;
                spherei3 += 3;
            }
        }

        let spherePicker: LatticeCellPicker = new LatticeCellPicker(spheres.picking, this._lattice);

        buffers[0] = BufferCreator.createSphereBufferFromArrays(
            spheres.position, spheres.color, spheres.radius, spherePicker);

        return buffers;
    }

    private createHoneycombLattice(sphereRadius: number): Buffer[] {
        let buffers: Array<Buffer> = new Array<Buffer>(1);

        const w = this._lattice.width;
        const h = this._lattice.height;
        const numOfCells = w * h;

        let spheres = {
            position: new Float32Array(numOfCells * 3),
            color: new Float32Array(numOfCells * 3),
            radius: new Float32Array(numOfCells),
            picking: new Uint32Array(numOfCells),
        }

        const color = new Color(1, 1, 1);
        let pos: Vector3;
        let spherei = 0, spherei3 = 0;

        for (let rowi = 0; rowi < h; ++rowi) {
            for (let coli = 0; coli < w; ++coli) {
                pos = this._lattice.getPosition(rowi, coli, 0, false);

                spheres.position[spherei3] = pos.x;
                spheres.position[spherei3 + 1] = pos.y;
                spheres.position[spherei3 + 2] = pos.z;
                spheres.color[spherei3] = color.r;
                spheres.color[spherei3 + 1] = color.g;
                spheres.color[spherei3 + 2] = color.b;
                spheres.radius[spherei] = sphereRadius;
                spheres.picking[spherei] = this._lattice.getIndex(rowi, coli);
                ++spherei;
                spherei3 += 3;
            }
        }
        let spherePicker: LatticeCellPicker = new LatticeCellPicker(spheres.picking, this._lattice);

        buffers[0] = BufferCreator.createSphereBufferFromArrays(
            spheres.position, spheres.color, spheres.radius, spherePicker);

        return buffers;
    }
}

export default LatticeRepresentation;