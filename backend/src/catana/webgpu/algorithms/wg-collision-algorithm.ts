/// <reference types="@webgpu/types" />

//import {BitArray} from "../../../utils/bitarray";
import {Box3, Matrix4, OrthographicCamera, PerspectiveCamera, Vector3} from "three";

import WgAlgorithm from "./wg-algorithm";
import WgContext from "../wg-context";
import WgBuffer, {BufferFeature} from "../wg-buffer";
import WgCompGridAssignShader from "../shaders/wg-comp-grid-assign-shader";
import WgCompSortShader from "../shaders/wg-comp-sort-shader";
import WgCompMapXyzShader from "../shaders/wg-comp-map-xyz-shader";
import WgCompCollisionGlobalShader from "../shaders/wg-comp-collision-global-shader";
import WgScanAlgorithm from "./wg-scan-algorithm";
import {BitArray} from "../../../utils/bitarray";
import WgPass from "../wg-pass";
import WgRendCollisionShader, {
    WgRendCollisionShaderMode,
    WgRendCollisionShaderUniforms
} from "../shaders/wg-rend-collision-shader";
import WgRenderTarget from "../wg-render-target";
import StructureComponent from "../../../component/structure-component";
import CgStructureComponent from "../../component/cg-structure-component";
import Structure from "../../../structure/structure";
import RadiusFactory from "../../../utils/radius-factory";

type Camera = PerspectiveCamera | OrthographicCamera;

type AtomicComponent = StructureComponent | CgStructureComponent;

export interface ComponentObject {
    readonly c: AtomicComponent;
    readonly s: Structure;
}

interface Grid {
    box: Box3,
    binSize: Vector3;
    shape: Vector3;
    numBins: number;
}

interface ComponentData {
    readonly compId: number,
    readonly offset: number,
    readonly byteOffset: number,
    readonly length: number,
    matrix: Matrix4,
    error: number
}

export interface WgCollisionAlgorithmCollisionParameters {
    lenience: number
}

export interface WgCollisionAlgorithmRenderingParameters {
    camera: Camera;
    target: WgRenderTarget;
    mode: WgRendCollisionShaderMode;
    color: string;
    opacity: number;
    radius: number;
    thickness: number;
}

interface TransformData {
    transform: Matrix4,
    elemIdStart: number,
    elemIdEnd: number
}

/**
 * Implements the collision algorithm.
 * This class is responsible for the following:
 * - Initialization of buffers and data structures necessary for the
 *   collision detection (based on provided Components)
 * - Keeping track of buffers and using them in GPU operations
 * - Update of the matrix of a component
 * - Update of collision detection parameters
 * - Update of rendering parameters
 * - Reading the collision detection results from the GPU to the CPU (slow)
 * - Keeping track of the error/imprecision of the collision detection calculations
 *
 * The first step of the algorithm is defining a uniform grid that will contain all the atoms.
 * This allows us to compare an atom only with its neighbors, and not with all other atoms.
 * We try to have each cell of the grid have the size of the smallest atom radius.
 * If the grid is too large and there are too many cells,
 * we increase the size of the cells until there aren't too many cells.
 *
 * The algorithm consists of the following passes:
 * - ASSIGN passes (assigns the atoms to a cell in a grid)
 *   - FILL per grid cell:   set all elements of perBin_elemCount to ZERO
 *   - FILL per atom:        set all elements of perElem_bonds_sorted
 *   - GRID ASSIGN per atom: update the matrix of a specific component (if requested)
 *                           and, most importantly, assign each atom to a grid cell
 *
 * - SORT passes (sorts the atoms by their cell - improves caching coherence - counting sort)
 *   - SCAN passes (multiple) per grid cell: performs a scan/prefix-sum on perBin_elemCountScan
 *   - FILL per atom:                        sets all elements of perElem_elemId_sorted to 0xffffffff (U32 max)
 *   - SORT per atom:                        calculates the new indexes for every atom, from perElem_binId
 *   - MAP XYZ per atom:                     based on the new indices from SORT, map/rearrange all other
 *                                           atom data (positions, etc.)
 *
 * - COLLIDE GLOBAL passes (actually only one pass... performs the collision detection!)
 *   - COLLIDE GLOBAL per atom: see WgCompCollisionGlobalShader for more details
 *
 * - RENDER passes (optional - again, only one pass)
 *   - RENDER pet atom: Based on atom positions and the result of the collision detection,
 *                      render the atoms that do collide
 */
export default class WgCollisionAlgorithm extends WgAlgorithm {

    private readonly debug?: string;
    //private readonly elemRadius: number;
    private readonly numElems: number;
    private rf: RadiusFactory;

    private readonly componentData: Map<AtomicComponent, ComponentData>;

    private readonly grid: Grid;

    private readonly buffers: {
        // Per element
        perElem_binId: WgBuffer<Uint32Array>,
        perElem_elemId_sorted: WgBuffer<Uint32Array>,
        perElem_elemData: WgBuffer<Float32Array>,
        perElem_elemData_sorted: WgBuffer<Float32Array>,
        perElem_bonds: WgBuffer<Uint32Array>,
        perElem_bonds_sorted: WgBuffer<Uint32Array>,
        perElem_collision: WgBuffer<Uint32Array>,
        perElem_collision_unsorted: WgBuffer<Uint32Array>, // TODO clearable
        perElem_collision_output: WgBuffer<Uint32Array>,

        // Per bin
        perBin_elemCountScan: WgBuffer<Uint32Array>, // TODO clearable
        bin_maxElemCount: WgBuffer<Uint32Array>
    };

    //private readonly shaders: WgCompShader[] = [];

    //private readonly gridReassignShader: WgCompGridReassignShader;

    private static readonly MAX_BINDING_SIZE = 134217728; // 128 MB
    private static readonly MAX_DISPATCH_SIZE = 65535;
    private static readonly WORKGROUP_SIZE = 256; // TODO well, ideally it depends on the task and GPU... fix it later!
    private static readonly MAX_SIZE = WgCollisionAlgorithm.MAX_DISPATCH_SIZE * WgCollisionAlgorithm.WORKGROUP_SIZE;
    public static readonly MAX_BINS = Math.min(WgCollisionAlgorithm.MAX_BINDING_SIZE / 4, WgCollisionAlgorithm.MAX_SIZE);
    public static readonly MAX_COMPONENTS = 256;

    // 16777215 = 24 bit max... restriction due to packaging of data in Elem buffer: [vec3<f32> pos] + [u4 radius; u24 elemId]
    public static readonly MAX_ELEMENTS = Math.min(WgCollisionAlgorithm.MAX_BINDING_SIZE / (4 * 4), WgCollisionAlgorithm.MAX_SIZE, 16777215);

    private assignShader: WgCompGridAssignShader;

    // Collision params
    private collisionShader: WgCompCollisionGlobalShader;
    //private collisionParams: WgCollisionAlgorithmCollisionParameters;

    private ranOnce: boolean = false;

    //private readonly reassignPasses: WgPass[] = [];
    private readonly assignPasses: WgPass[] = [];
    private readonly sortPasses: WgPass[] = [];
    private readonly collideGlobalPasses: WgPass[] = [];
    //private readonly unsortPasses: WgPass[] = [];
    //private readonly copyOutputPass: WgPass;

    private renderShader: null | WgRendCollisionShader = null;
    private readonly renderPasses: WgPass[] = [];
    private renderTarget: null | WgRenderTarget = null;

    /**
     * Initializes buffers and data structures necessary for the collision detection (based on provided Components)
     * @param context The WebGPU context
     * @param comps The components that will take part in the collision detection
     * @param collisionParams The parameters for the collision detection
     * @param renderingParams The parameters for the visual representation (rendering)
     *                        of the results of the collision detection algorithm
     * @param debug The name of the debug context
     */
    public constructor(context: WgContext, comps: ComponentObject[], collisionParams: WgCollisionAlgorithmCollisionParameters, renderingParams?: WgCollisionAlgorithmRenderingParameters, debug?: string) {
        super(context);

        const timeStart = performance.now();

        //this.elemRadius = elemRadius;
        //this.collisionParams = collisionParams;
        this.rf = new RadiusFactory({ type: "covalent" }); // TODO try 'vdw'
        this.debug = debug;

        //const SQRT_2 = Math.sqrt(2);
        const CBRT_2 = Math.cbrt(2); // Cubic root of 2

        console.assert(comps.length <= WgCollisionAlgorithm.MAX_COMPONENTS);

        const numElems = comps.map(v => v.s.atomCount).reduce((a, b) => a + b);
        console.assert(numElems <= WgCollisionAlgorithm.MAX_ELEMENTS);
        this.numElems = numElems;

        // Calculate bounding box (for grid definition)
        //this.components = new Map<Component, { id: number; matrix: Matrix4 }>();
        //const elemStart: Uint32Array = new Uint32Array(comps.length);
        this.componentData = new Map<StructureComponent, ComponentData>();
        const box = new Box3();
        const xyzcr: Float32Array = new Float32Array(numElems * 4);
        const bonds: Uint32Array = new Uint32Array(numElems * 4);
        let radiusMin: number = Infinity;
        let offset = 0;
        for (let i = 0; i < comps.length; ++i) {
            const c = comps[i];
            const byteOffset = offset * 4 * 4;
            const length = c.s.atomCount;
            this.componentData.set(c.c, {
                compId: i,
                offset: offset,
                byteOffset: byteOffset,
                length: length,
                matrix: c.c.matrix.clone(),
                error: 0
            });
            const compXyzcr = new Float32Array(xyzcr.buffer, byteOffset, length * 4);
            const compBonds = new Uint32Array(bonds.buffer, byteOffset, length * 4);
            const compRadiusMin = this._resetComponent(c, compXyzcr, compBonds, offset);
            radiusMin = Math.min(radiusMin, compRadiusMin);
            //box.union(c.c.getBox());
            box.union(c.s.getBoundingBox().applyMatrix4(c.c.matrix));
            //byteOffset += compXyzcr.byteLength;
            offset += length;
        }

        // Define grid
        const elemDiameter = radiusMin * 2;
        const gridBinSize = new Vector3(elemDiameter, elemDiameter, elemDiameter);
        //const gridBinSize = new Vector3(elemRadius, elemRadius, elemRadius);
        //const gridMin = box.min;
        //const gridMax = box.max.add(gridBinSize);
        box.max.add(gridBinSize);
        const gridRange = box.max.clone().sub(box.min);
        const gridShape = gridRange.clone().divide(gridBinSize).ceil();

        // Reduce number of grid cells if there are too many
        let numBins: number = gridShape.x * gridShape.y * gridShape.z;
        let changed: boolean = false;
        while (numBins > WgCollisionAlgorithm.MAX_BINS) {
            gridBinSize.x *= CBRT_2;
            gridBinSize.y *= CBRT_2;
            gridBinSize.z *= CBRT_2;
            gridShape.copy(gridRange.clone().divide(gridBinSize).ceil());
            numBins = gridShape.x * gridShape.y * gridShape.z;
            changed = true;
        }
        if (changed) {
            const requestedSize = "(" + radiusMin + "," + radiusMin + "," + radiusMin + ")";
            const insteadSize = "(" + gridBinSize.x + "," + gridBinSize.y + "," + gridBinSize.z + ")";
            console.warn("Grid cells could not be kept at requested size " + requestedSize + " because the" +
                " number of cells would have been too large (larger than " + WgCollisionAlgorithm.MAX_BINS + "). The " +
                "grid cells will instead have the size " + insteadSize + ", which means that he grid will have " +
                numBins + " cells. Grid min: [" + box.min.toArray().toString() + "]. Grid max: [" +
                box.max.toArray().toString() + "]. Grid shape: (" +
                gridShape.x + "," + gridShape.y + "," + gridShape.z + ").");
        }

        this.grid = {
            box: box,
            binSize: gridBinSize,
            shape: gridShape,
            numBins: numBins
        };

        const feats = !debug ? [] : [BufferFeature.COPIABLE];
        const feats2 = [...feats, BufferFeature.CLEARABLE];
        const feats3 = [...feats, BufferFeature.VERTEX];
        const feats4 = [...feats, BufferFeature.WRITABLE];
        const collisionShape: [number, number, number] = [Math.ceil(numElems / 32), 1, 1];
        this.buffers = {
            //perComp_elemStart: WgBuffer.createStorage(context, [comps.length, 1, 1], Uint32Array, elemStart, copiable, "perComp_elemStart"),
            //perComp_matrix: WgBuffer.createStorage(context, [matrices.length, 1, 1], Float32Array, matrices, copiable, "perComp_matrix"),

            // Per element
            perElem_binId: WgBuffer.createEmptyStorage(context, [numElems, 1, 1], Uint32Array, feats, "perElem_binId"),
            perElem_elemId_sorted: WgBuffer.createEmptyStorage(context, [numElems, 1, 1], Uint32Array, feats, "perElem_elemId_sorted"),
            perElem_elemData: WgBuffer.createStorage(context, [4, numElems, 1], Float32Array, xyzcr, feats4, "perElem_elemData"),
            perElem_elemData_sorted: WgBuffer.createEmptyStorage(context, [4, numElems, 1], Float32Array, feats3, "perElem_elemData_sorted"),
            perElem_bonds: WgBuffer.createStorage(context, [4, numElems, 1], Uint32Array, bonds, feats, "perElem_bonds"),
            perElem_bonds_sorted: WgBuffer.createEmptyStorage(context, [4, numElems, 1], Uint32Array, feats, "perElem_bonds_sorted"),

            // Per bin
            perBin_elemCountScan: WgBuffer.createEmptyStorage(context, [numBins, 1, 1], Uint32Array, feats2, "perBin_elemCountScan"),

            // Misc
            bin_maxElemCount: WgBuffer.createEmptyStorage(context, [1, 1, 1], Uint32Array, feats, "bin_maxElemCount"),

            // OUTPUT COPIED FROM HERE! Only copiable buffer :)
            perElem_collision: WgBuffer.createEmptyStorage(context, collisionShape, Uint32Array, feats, "perElem_collision"),
            perElem_collision_unsorted: WgBuffer.createEmptyStorage(context, collisionShape, Uint32Array, [BufferFeature.COPIABLE, BufferFeature.CLEARABLE], "perElem_collision_unsorted"),

            // OUTPUT COPIED TO HERE!
            perElem_collision_output: WgBuffer.createOutput(context, collisionShape, Uint32Array, "perElem_collision_output"),
        };

        if (renderingParams) this.activateRendering(renderingParams);

        this.assignPasses = this.createAssignPasses();
        this.sortPasses = this.createSortPasses();
        this.collideGlobalPasses = this.createCollideGlobalPasses(collisionParams);

        if (debug) {
            const timeElapsed = performance.now() - timeStart;
            console.log("Time to set up (construct) WgCollisionAlgorithm: " + timeElapsed + " ms");
        }
    }

    private createAssignPasses(): WgPass[] {

        const passes: WgPass[] = [];

        // SET pass: set all elements of perBin_elemCount to ZERO
        {
            //const shader = new WgCompSetShader(this.context, this.buffers.perBin_elemCountScan, 0);
            //passes.push(WgPass.createCompShaderPass(this.context, shader));
            //passes.push(WgPass.createSetZeroPass(this.buffers.perBin_elemCountScan));
            passes.push(WgPass.createFillPass(this.context, this.buffers.perBin_elemCountScan, 0));
        }

        // SET pass: set all elements of perElem_bonds_sorted
        {
            passes.push(WgPass.createFillPass(this.context, this.buffers.perElem_bonds_sorted, 0xffffffff));
        }

        // GRID ASSIGN pass: update the matrix of a specific component (if requested)
        //                   and, most importantly, assign each atom to a grid cell
        {
            //passes.push(WgPass.createCompShaderPass(this.context, this.gridReassignShader));
            const uniforms = {
                gridMin: this.grid.box.min,
                gridMax: this.grid.box.max,
                gridBinSize: this.grid.binSize
            }
            const buffers = {
                //in_perComp_matrix: passBuffers.matrix,
                //in_perComp_elemStart: this.buffers.perComp_elemStart,
                //in_perElem_x: passBuffers.x,
                //in_perElem_y: passBuffers.y,
                //in_perElem_z: passBuffers.z,
                out_perBin_elemCount: this.buffers.perBin_elemCountScan,
                out_perElem_binId: this.buffers.perElem_binId,
                //out_perElem_xyzc: this.buffers.perElem_xyzc,
                //in_perComp_matrix: this.buffers.perComp_matrix,
                in_perElem_elemData: this.buffers.perElem_elemData,
            };
            this.assignShader = new WgCompGridAssignShader(this.context, uniforms, buffers);
            passes.push(WgPass.createCompShaderPass(this.context, this.assignShader));
        }

        return passes;
    }

    private createSortPasses(): WgPass[] {

        const passes: WgPass[] = [];

        // SCAN pass:
        {
            const buffers = {
                dataBuffer: this.buffers.perBin_elemCountScan,
                maxBuffer: this.buffers.bin_maxElemCount
            };
            passes.push(...WgScanAlgorithm.createPasses(this.context, buffers.dataBuffer, buffers.maxBuffer));
        }

        // SET pass:
        {
            const U32_MAX = 0xffffffff;
            passes.push(WgPass.createFillPass(this.context, this.buffers.perElem_elemId_sorted, U32_MAX));
        }

        // SORT pass:
        {
            const buffers = {
                perElem_binId: this.buffers.perElem_binId,
                perBin_elemCount_scan: this.buffers.perBin_elemCountScan,
                bin_maxElemCount: this.buffers.bin_maxElemCount,
                perElem_elemId_sorted: this.buffers.perElem_elemId_sorted
            };
            const shader = new WgCompSortShader(this.context, buffers);
            passes.push(WgPass.createCompShaderPass(this.context, shader));
        }

        // MAP XYZ pass:
        {
            const buffers = {
                indices: this.buffers.perElem_elemId_sorted,
                in_xyzcr: this.buffers.perElem_elemData,
                out_xyzcr: this.buffers.perElem_elemData_sorted,
                in_bonds: this.buffers.perElem_bonds,
                out_bonds: this.buffers.perElem_bonds_sorted
            };
            const shader = new WgCompMapXyzShader(this.context, buffers);
            passes.push(WgPass.createCompShaderPass(this.context, shader));
        }

        return passes;
    }

    private createCollideGlobalPasses(collisionParams: WgCollisionAlgorithmCollisionParameters): WgPass[] {

        const passes: WgPass[] = [];

        // COLLIDE GLOBAL pass
        {
            const buffers = {
                in_xyzcr: this.buffers.perElem_elemData_sorted,
                in_bonds: this.buffers.perElem_bonds_sorted,
                //in_perComp_matrix: this.buffers.perComp_matrix,
                in_perBinElemCount_scan: this.buffers.perBin_elemCountScan,
                out_collisions: this.buffers.perElem_collision
            };
            const uniforms = {
                gridMin: this.grid.box.min,
                gridMax: this.grid.box.max,
                gridBinSize: this.grid.binSize,
                //elemRadius: this.elemRadius
                lenience: collisionParams.lenience
            };
            this.collisionShader = new WgCompCollisionGlobalShader(this.context, buffers, uniforms);
            passes.push(WgPass.createCompShaderPass(this.context, this.collisionShader));
        }

        return passes;
    }

    public dispose() {
        for (const buffer of Object.values(this.buffers)) buffer?.dispose();
        //for (const shader of this.shaders) shader.dispose();
        if (this.renderTarget) {
            this.renderTarget.dispose();
        }
    }

    /**
     * WARNING: Make sure you run start() once before running this function
     * Runs the entire collision detection pipeline, including rendering
     * @param td The data necessary to apply a transformation to one component in the next
     *           collision detection algorithm. If nothing/undefined is provided,
     *           no transformation will occur
     */
    private async run(td?: TransformData) {
        if (td) {
            await this.assignShader.setTransform(td.transform, td.elemIdStart, td.elemIdEnd);
        } else {
            await this.assignShader.removeTransform();
        }
        this.ranOnce = true;
        return this._run([
            ...this.assignPasses,
            ...this.sortPasses,
            ...this.collideGlobalPasses,
            ...this.renderPasses
        ], this.debug);
    }

    /**
     * Performs the first iteration of this algorithm
     * It is strongly recommended to run this function before running run() or draw(),
     * otherwise, problems may occur
     */
    public async start() {
        return this.run();//.then(() => this.draw());
    }

    /**
     * Runs only the rendering passes (visual representation of collision detection results)
     */
    public async draw() {
        if (!this.ranOnce) {
            console.error("Draw request on WgCollisionAlgorithm before the collision algorithm was ran at least once");
            return;
        }
        return this._run([...this.renderPasses], this.debug);
    }

    /**
     * Resets the atom positions of a component
     * This will copy all of the atom positions from CPU to GPU (slow)
     */
    public resetComponent(c: ComponentObject) {
        const data = this.componentData.get(c.c);
        if (!data) {
            console.error("Failed to resetComponent: component " + c.c.name + " not found (it was probably not " +
                "initialized with the collision detection. Try restarting the collision detection.");
            return;
        }
        const elemData = new Float32Array(c.s.atomCount * 4);
        const bonds = new Uint32Array(c.s.atomCount * 4);
        this._resetComponent(c, elemData, bonds, data.offset);
        data.matrix = c.c.matrix;
        data.error = 0;
        this.buffers.perElem_elemData.write(elemData, data.byteOffset, c.s.atomCount);
        this.run();//.then(() => this.draw());
    }

    /**
     * @returns Smallest element radius for this component
     */
    private _resetComponent(c: ComponentObject, elemData: Float32Array, bonds: Uint32Array, offset: number): number {
        let radiusMin: number = Infinity;
        let i: number = -1;
        c.s.eachAtom((ap) => {
            // For this atom, set the bonds
            let bondi = 0;
            const atomi = ap.index;

            ap.eachBond((bp) => {
                if (bondi === 4) {
                    const bonds: string[] = [];
                    ap.eachBond(bp => bonds.push(bp.index + ":" + bp.atomIndex1 + "-" + bp.atomIndex2));
                    console.error("Too many bonds (>4) for atom " + atomi + " of component " + c.c.name + " (" + bonds.join(", ") + "). Ignoring further bonds...");
                    return;
                }
                let atom2i = bp.atomIndex1;
                if (atom2i === atomi) atom2i = bp.atomIndex2;
                bonds[++bondi + i] = atom2i + offset;
            });
            while (bondi < 4) bonds[++bondi + i] = 0xffffffff;

            // For this atom, set the positions + compId + radius
            const pos = new Vector3(ap.x, ap.y, ap.z);
            pos.applyMatrix4(c.c.matrix);
            elemData[++i] = pos.x;
            elemData[++i] = pos.y;
            elemData[++i] = pos.z;

            const radiusAngstrom = this.rf.atomRadius(ap);
            radiusMin = Math.min(radiusMin, radiusAngstrom);

            const radius = Math.round(radiusAngstrom * 100) >>> 0; // *100 -> Angstrom to picometer;
            console.assert(radius >= 0x00 && radius <= 0xff);
            //console.log(radius);

            const elemId = offset + atomi;
            console.assert(elemId <= WgCollisionAlgorithm.MAX_ELEMENTS);
            console.assert((elemId & 0x00ffffff) === elemId);
            //console.log(elemId);

            const radiusPm_elemId = (radius << 24) | (elemId & 0x00ffffff);
            elemData[++i] = new Float32Array(new Uint32Array([radiusPm_elemId]).buffer)[0];
        });
        return radiusMin;
    }

    /**
     * Updates the matrix of a component
     * @param c Component whose matrix will be updated
     * @param matrix The new matrix of Component 'c'
     */
    public async updateComponent(c: AtomicComponent, matrix?: Matrix4) {
        const compData = this.componentData.get(c);
        if (compData === undefined) {
            console.warn("Component " + c.name + " is not in WgCollisionAlgorithm, so this method should not" +
                " have been called. This call will be ignored.")
            return this;
        }

        // Calculates the matrix that will get us from the old matrix to the new one
        const oldMatrix = compData.matrix;
        const newMatrix = matrix?.clone() || c.matrix.clone();
        const transform = new Matrix4().getInverse(oldMatrix).premultiply(newMatrix);

        // Figures out the first and last indices of the atoms of the given component
        const elemIdStart = compData.offset;
        const elemIdEnd = elemIdStart + compData.length;

        // Runs the collision detection algorithm with the new matrix
        const promise = this.run({ transform, elemIdStart, elemIdEnd });

        // Compute the error (imprecision) of the matrix we calculate
        // See getError() for a full explanation
        const newMatrix_computed = oldMatrix.premultiply(transform); // In-place premultiplication!
        compData.error = newMatrix_computed.elements
            .map((v,i) => Math.abs(v - newMatrix.elements[i]))
            .reduce((a, b) => a + b);

        return promise;
    }

    public activateRendering(renderingParams: WgCollisionAlgorithmRenderingParameters) {
        this.renderShader = new WgRendCollisionShader(
            this.context,
            this.buffers.perElem_elemData_sorted,
            this.buffers.perElem_collision,
            renderingParams.camera,
            renderingParams.target,
            renderingParams.radius,
            renderingParams.mode,
            renderingParams.color,
            renderingParams.opacity,
            renderingParams.thickness);
        this.renderTarget = renderingParams.target;
        this.renderPasses.length = 0;
        this.renderPasses.push(WgPass.createRenderPass(this.context, this.renderShader));
        if (this.ranOnce) this.draw();
    }

    public deactivateRendering() {
        this.renderShader?.dispose();
        this.renderShader = null;
        this.renderPasses.length = 0;
        this.renderTarget = null;
    }

    /**
     * The box where the collision detection is active
     */
    public get gridBox(): Box3 {
        return new Box3(this.grid.box.min, this.grid.box.max);
    }

    /**
     * Gets the error/imprecision of the collision detection calculations for a specific component
     *
     * Explanation: The precise way to update the positions of the atoms of a Component when its matrix
     *                  changes would be (1) get the initial positions of the atoms (2) transform these
     *                  positions by the new matrix.
     *              However, we do not have the initial atom positions on the GPU!
     *              So instead, we (1) get the current positions of the atoms (2) transform these
     *                  positions by the (newMatrix * inverse(oldMatrix)).
     *              However, this comes with a cost: the result of this operation is imprecise.
     *                  It is not the same as the first method.
     * The imprecision is the sum of all elements of the absolute element-wise difference of
     *     newMatrix and ( (newMatrix * inverse(oldMatrix)) * oldMatrix ), or, perhaps more concise:
     *
     *     trans = new * inv(old);                      <- Matrix to go from old to new position
     *     error = sum( abs( (trans * old) - new ) );   <- abs() is elementwise
     *                                                     sum() sums the individual matrix elements
     *
     * @param c The component to get the collision detection error/imprecision of
     */
    public getError(c: AtomicComponent): null | number {
        const data = this.componentData.get(c);
        if (!data) {
            console.error("Cannot get error of component " + c.name + " because there is no such component in the " +
                "collision system (it was probably not initialized with the collision detection. Try restarting the " +
                "collision detection.");
            return null;
        }
        return data.error;
    }

    /**
     * Sets the size of the rendering target
     */
    public async setSize(width: number, height: number) {
        if (!this.renderShader || !this.renderTarget) {
            console.warn("Unable to set size because rendering was not activated");
            return;
        }
        this.renderTarget.setSize(width, height);
    }

    /**
     * Sets the uniforms/parameters for the collision detection calculations
     */
    public setCollisionUniforms(uniforms: { lenience: number }) {
        if (!this.collisionShader) {
            console.warn("Unable to set " + Object.keys(uniforms).join(", ") + " because the collision shader was not created");
            return;
        }
        this.collisionShader.setCollisionParams(uniforms);
        this._run([...this.collideGlobalPasses]);//, ...this.renderPasses]);
        //this.setRenderUniforms(uniforms);
    }

    /**
     * Sets the uniforms/parameters for the visual representation (rendering) of the collision detection
     */
    public setRenderUniforms(uniforms: Partial<WgRendCollisionShaderUniforms>) {
        if (!this.renderShader) {
            console.warn("Unable to set " + Object.keys(uniforms).join(", ") + " because rendering was not activated");
            return;
        }
        this.renderShader.setUniforms(uniforms);
        this.draw();
    }

    /**
     * Reads the collision buffer from the GPU to the CPU (slow)
     * Each bit in the Uint32Array represents an atom
     * 1 means this atom collides with at least one other atom
     * 0 means this atom does not collide with any other atom
     */
    public async read(): Promise<Uint32Array> {
        return await this.buffers.perElem_collision_output.read();
    }

    /**
     * Reads the collision buffer from the GPU to the CPU
     * and converts it to a BitArray
     */
    public async readAsBitArray(): Promise<BitArray> {
        return new BitArray(this.numElems, await this.read());
    }
}