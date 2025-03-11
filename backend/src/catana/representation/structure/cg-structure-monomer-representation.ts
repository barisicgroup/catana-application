import { CgStructureRepresentation, CgStructureUpdateFields } from "./cg-structure-representation";
import { CoarseGrainedRepresentationRegistry, ColormakerRegistry } from "../../../globals";
import { Vector3 } from "three";
import BufferCreator from "../../geometry/buffer-creator";
import { CgNucleotidePicker } from "../../picker/cg-nucleotide-picker";
import { CgAminoAcidPicker } from "../../picker/cg-amino-acid-picker";
import { CgNucleotideBondPicker } from "../../picker/cg-nucleotide-bond-picker";
import { CgAminoAcidBondPicker } from "../../picker/cg-amino-acid-bond-picker";
import BitArray_Legacy from "../../../utils/bitarray";
import CgStructure from "../../data_model/cg-structure";
import Viewer from "../../../viewer/viewer";
import { RepresentationParameters } from "../../../representation/representation";
import SphereImpostorBuffer from "../../../buffer/sphereimpostor-buffer";
import CylinderImpostorBuffer from "../../../buffer/cylinderimpostor-buffer";
import BoxBuffer from "../../../buffer/box-buffer";
import Buffer from "../../../buffer/buffer";
import CgPolymer from "../../data_model/cg-polymer";
import RadiusFactory from "../../../utils/radius-factory";
import Filter from "../../../filtering/filter";
import CgNucleicAcidStrand from "../../data_model/cg-nucleic-acid-strand";
import CgAminoAcidChain from "../../data_model/cg-amino-acid-chain";

/**
 * Following constants are empirically determined to make the representation 
 * look good enough (i.e., to have no overlaps, for example) while 
 * also approximately matching real atomistic dimensions
 * ---
 * Radii for nucleotide/amino acid spheres are determined by the RadiusFactory class
 */
export class MonomerRepresentationConstants {
    public static readonly STICK_RADIUS: number = 3.32 / 9 * 2;
    public static readonly STICK_BB_NB_RADIUS: number = 3.32 / 9;
    public static readonly STICK_AA_RADIUS: number = 3.32 / 9 * 1.5;
    public static readonly BOX_R_RADIUS: number = 4.5;
    public static readonly BOX_Y_RADIUS: number = 3.25;
    public static readonly BOX_WIDTH: number = 3;
}

type PolymerBufferType = SphereImpostorBuffer | BoxBuffer | CylinderImpostorBuffer;
type MonomerSetDict = Map<number, BitArray_Legacy>;

/**
 * Monomer representation can be considered as a "highest-detail" coarse-grained representation,
 * with a goal to visualize all important parameters of the coarse-grained data model, employing
 * Calladine–Drew-inspired style of DNA strands visualization.
 */
export class CgStructureMonomerRepresentation extends CgStructureRepresentation {

    /**
     * Keeps track of all monomers to enable faster update of colors
     */
    private _monomerSetDict: MonomerSetDict;

    constructor(cgStructure: CgStructure, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(cgStructure, viewer, params);
    }

    public init(params: Partial<RepresentationParameters>) {
        let p: any = params ?? {};

        p.colorScheme = p.colorScheme ?? "chainname";
        p.colorScale = p.colorScale ?? "RdYlBu";

        this._monomerSetDict = this.createMonomerSetDict();
        this._filter.signals.stringChanged.add(() => {
            this.update();
        });
        super.init(params);
    }

    private updateMonomerSets(_monomerSetDict?: MonomerSetDict, _filter?: Filter) {
        const monomerSetDict = _monomerSetDict || this._monomerSetDict;
        const filter = _filter || this._filter;
        this.cgStructure.forEachPolymer((p) => {
            let monomerSet = monomerSetDict.get(p.globalId);

            if (monomerSet === undefined || monomerSet.length !== p.length) {
                monomerSet = new BitArray_Legacy(p.length, true);
                monomerSetDict.set(p.globalId, monomerSet);
            }

            if (filter.isAllFilter()) {
                monomerSet.setAll();
            } else if (filter.isNoneFilter()) {
                monomerSet.clearAll();
            } else {
                p.forEachMonomer((mp, i) => {
                    if (!filter.cgMonomerTest || filter.cgMonomerTest(mp)) {
                        monomerSet!.set(i);
                    } else {
                        monomerSet!.clear(i);
                    }
                });
            }
        });
    }

    private createMonomerSetDict(): MonomerSetDict {
        const monomerSetDict: MonomerSetDict = new Map();
        this.cgStructure.forEachPolymer((p) => {
            monomerSetDict.set(p.globalId, new BitArray_Legacy(p.length, true));
        });
        return monomerSetDict;
    }

    private static includeCyclicBond(p: CgPolymer, set: BitArray_Legacy): boolean {
        // Include the end-end bond of cyclic polymers when their end residues
        // will also be visualized
        return p.isCyclic() && set.isSet(0, set.length - 1);
    }

    private static getNumberOfCylinders(p: CgPolymer, set: BitArray_Legacy) {
        let nCylinders = 0;
        let lastIndex: null | number = null;
        set.forEach((index) => {
            if (index - 1 === lastIndex) {
                ++nCylinders;
            }
            lastIndex = index;
        });

        if (this.includeCyclicBond(p, set)) {
            ++nCylinders;
        }

        return nCylinders;
    }

    private static copyForSegment(source: Float32Array, target1: Float32Array, target2: Float32Array,
        source_j: number, target_j: number) {
        target1[target_j] = source[source_j - 3];
        target1[target_j + 1] = source[source_j - 2];
        target1[target_j + 2] = source[source_j - 1];
        target2[target_j] = source[source_j];
        target2[target_j + 1] = source[source_j + 1];
        target2[target_j + 2] = source[source_j + 2];
    }

    /**
     * If only the color needs to be updated, performs a faster type of update
     * If not, perform the regular update of CgStructureRepresentation
     */
    public update(what?: CgStructureUpdateFields) {
        this.updateMonomerSets();

        if (what && what.color && !what.model) {
            const colormaker = ColormakerRegistry.getScheme(this.getColorParams());

            let nSpheres: number = 0;
            let nCylinders: number = 0;

            const sumSizes = (pol: CgPolymer) => {
                const monomerSet = this._monomerSetDict.get(pol.globalId);
                if (monomerSet) {
                    nSpheres += monomerSet.getSize();
                    nCylinders += CgStructureMonomerRepresentation.getNumberOfCylinders(pol, monomerSet);
                }
            };

            // Prepare new arrays with color data
            this.cgStructure.forEachNaStrand(sumSizes);

            const naPointColors = new Float32Array(nSpheres * 3);
            const naSegmentColors1 = new Float32Array(nCylinders * 3);
            const naSegmentColors2 = new Float32Array(naSegmentColors1.length);

            nSpheres = 0;
            nCylinders = 0;
            this.cgStructure.forEachAaChain(sumSizes);

            const aaPointColors = new Float32Array(nSpheres * 3);
            const aaSegmentColors1 = new Float32Array(nCylinders * 3);
            const aaSegmentColors2 = new Float32Array(aaSegmentColors1.length);

            // Assign colors to the arrays
            let i: number;
            let cylinder_i: number;

            const setColors = (pointColors: Float32Array, segmentColors1: Float32Array, segmentColors2: Float32Array) =>
                (polymer: CgPolymer) => {
                    if (polymer.length <= 0) { return; }

                    const monomerSet = this._monomerSetDict.get(polymer.globalId);
                    if (monomerSet === undefined) {
                        console.error("Cannot render following polymer, no monomer set:", polymer);
                        return;
                    }
                    const includeCyclicBond = CgStructureMonomerRepresentation.includeCyclicBond(polymer, monomerSet);

                    let lastIndex: null | number = null;
                    let monomer = polymer.getMonomerProxyTemplate();

                    for (let index = 0; index < polymer.length; ++index) {
                        monomer.index = index;
                        const j = i * 3;

                        if (!monomerSet.isSet(index)) {
                            continue;
                        }

                        colormaker.colorToArray(colormaker.monomerColor(monomer), pointColors, j);

                        if (index - 1 === lastIndex) {
                            const cylinder_j = cylinder_i * 3;
                            CgStructureMonomerRepresentation.copyForSegment(
                                pointColors, segmentColors1, segmentColors2, j, cylinder_j);
                            ++cylinder_i;
                        }

                        lastIndex = index;
                        ++i;
                    }

                    if (includeCyclicBond) {
                        const cylinder_j = cylinder_i * 3;

                        colormaker.colorToArray(
                            colormaker.monomerColor(polymer.proxyAtIndex(polymer.length - 1)!),
                            segmentColors1,
                            cylinder_j);

                        colormaker.colorToArray(
                            colormaker.monomerColor(polymer.proxyAtIndex(0)!),
                            segmentColors2,
                            cylinder_j);

                        ++cylinder_i;
                    }
                };

            i = 0;
            cylinder_i = 0;
            this.cgStructure.forEachNaStrand(setColors(naPointColors, naSegmentColors1, naSegmentColors2));

            i = 0;
            cylinder_i = 0;
            this.cgStructure.forEachAaChain(setColors(aaPointColors, aaSegmentColors1, aaSegmentColors2));

            // Update buffers with new data
            const naBuffers = 4;
            const aaBuffers = 2;

            const updateBuffers = (from: number, to: number,
                pointColors: Float32Array, segmentColors1: Float32Array, segmentColors2: Float32Array) => {
                for (let i = from; i < to; ++i) {
                    const data: { [id: string]: Float32Array } = {};
                    const b = this.bufferList[i];

                    if (i === from) { // First buffer is always backbone cylinders to be interpolated
                        data["color"] = segmentColors1;
                        data["color2"] = segmentColors2;
                    } else {
                        data["color"] = pointColors;
                        if (b.hasAttribute("color2")) {
                            data["color2"] = pointColors;
                        }
                    }
                    b.setAttributes(data);
                }
            }

            updateBuffers(0, naBuffers, naPointColors, naSegmentColors1, naSegmentColors2);
            updateBuffers(naBuffers, naBuffers + aaBuffers, aaPointColors, aaSegmentColors1, aaSegmentColors2);
        } else {
            super.update();
        }
    }

    public setFilter(filterStr: string, silent?: boolean): void {
        super.setFilter(filterStr, silent);
        this.updateMonomerSets();
    }

    public createBuffersWithFilter(filterString: string): Buffer[] {
        return this.createBuffers(filterString);
    }

    protected createBuffers(filterStr?: string): Buffer[] {
        const monomerSetDict: MonomerSetDict = filterStr
            ? this.createMonomerSetDict()
            : this._monomerSetDict;

        if (filterStr) {
            this.updateMonomerSets(monomerSetDict, new Filter(filterStr));
        }

        // Constants used throughout the rest of the function
        const buffers: Array<PolymerBufferType> = new Array<PolymerBufferType>();

        const colormaker = ColormakerRegistry.getScheme(this.getColorParams());
        const radiusFactory = new RadiusFactory();

        const naBallRadius = this.cgStructure.naStrandsCount > 0 && this.cgStructure.naStrands[0].length > 0 ?
            radiusFactory.cgMonomerRadius(this.cgStructure.naStrands[0].fivePrime!) : 0;
        const aaBallRadius = this.cgStructure.aaChainsCount > 0 && this.cgStructure.aaChains[0].length > 0 ?
            radiusFactory.cgMonomerRadius(this.cgStructure.aaChains[0].nTerm!) : 0;
        const boxRadiusR = MonomerRepresentationConstants.BOX_R_RADIUS;
        const boxRadiusY = MonomerRepresentationConstants.BOX_Y_RADIUS;
        const boxWidth = MonomerRepresentationConstants.BOX_WIDTH;
        const naStickRadius = MonomerRepresentationConstants.STICK_RADIUS;
        const aaStickRadius = MonomerRepresentationConstants.STICK_AA_RADIUS;
        const stickBbNbRadius = MonomerRepresentationConstants.STICK_BB_NB_RADIUS;

        // Storing number of elements included for each polymer to be able to
        // use these values in pickers.
        const naPickerPolymers: CgNucleicAcidStrand[] = [];
        const naPickerMonCounts: number[] = [];
        const naPickerBondCounts: number[] = [];

        const aaPickerPolymers: CgAminoAcidChain[] = [];
        const aaPickerMonCounts: number[] = [];
        const aaPickerBondCounts: number[] = [];

        // Temporary variables to be reused for various purposes
        let nSpheres: number = 0;
        let nCylinders: number = 0;
        let tmpVec: Vector3 = new Vector3();

        const computeSizes = (polymers: CgPolymer[], monCounts: number[], bondCounts: number[]) =>
            (pol: CgPolymer) => {
                if (pol.length <= 0) {
                    return;
                }

                const monomerSet = monomerSetDict.get(pol.globalId);

                if (monomerSet) {
                    let monCnt = monomerSet.getSize();
                    let bondCnt = CgStructureMonomerRepresentation.getNumberOfCylinders(pol, monomerSet);

                    nSpheres += monCnt;
                    nCylinders += bondCnt;

                    polymers.push(pol);
                    monCounts.push(monCnt);
                    bondCounts.push(bondCnt);
                }
            };

        this.cgStructure.forEachNaStrand(computeSizes(naPickerPolymers, naPickerMonCounts, naPickerBondCounts));

        // Nucleic acid strand buffers data
        let naBackboneCylinders = {
            position1: new Float32Array(nCylinders * 3),
            position2: new Float32Array(nCylinders * 3),
            color1: new Float32Array(nCylinders * 3),
            color2: new Float32Array(nCylinders * 3),
            radius: new Float32Array(nCylinders).fill(naStickRadius),
            picking: new Uint32Array(nCylinders),
        }

        let naSpheres = {
            position: new Float32Array(nSpheres * 3),
            color: new Float32Array(nSpheres * 3),
            radius: new Float32Array(nSpheres).fill(naBallRadius),
            picking: new Uint32Array(nSpheres),
        }

        let naBoxes = {
            position: new Float32Array(nSpheres * 3),
            color: naSpheres.color,
            heightAxis: new Float32Array(nSpheres * 3),
            depthAxis: new Float32Array(nSpheres * 3),
            size: new Float32Array(nSpheres),
            picking: naSpheres.picking
        }

        let naBaseCylinders = {
            position1: naSpheres.position,
            position2: naBoxes.position,
            color1: naSpheres.color,
            color2: naSpheres.color,
            radius: new Float32Array(nSpheres).fill(stickBbNbRadius),
            picking: naSpheres.picking
        }

        nSpheres = 0;
        nCylinders = 0;
        this.cgStructure.forEachAaChain(computeSizes(aaPickerPolymers, aaPickerMonCounts, aaPickerBondCounts));

        // Amino acid chains buffers data
        let aaCylinders = {
            position1: new Float32Array(nCylinders * 3),
            position2: new Float32Array(nCylinders * 3),
            color1: new Float32Array(nCylinders * 3),
            color2: new Float32Array(nCylinders * 3),
            radius: new Float32Array(nCylinders).fill(aaStickRadius),
            picking: new Uint32Array(nCylinders),
        }

        let aaSpheres = {
            position: new Float32Array(nSpheres * 3),
            color: new Float32Array(nSpheres * 3),
            radius: new Float32Array(nSpheres).fill(aaBallRadius),
            picking: new Uint32Array(nSpheres),
        }

        // Filling in buffer data
        let i = 0;
        let cylinder_i = 0;
        this.cgStructure.forEachNaStrand(strand => {
            if (strand.length <= 0) { return; }

            const monomerSet = monomerSetDict.get(strand.globalId);
            if (monomerSet === undefined) {
                console.error("Cannot render following strand, no monomer set:", strand);
                return;
            }
            const includeCyclicBond = CgStructureMonomerRepresentation.includeCyclicBond(strand, monomerSet);

            let lastIndex: null | number = null;
            let nucleotide = strand.getMonomerProxyTemplate();

            for (let index = 0; index < strand.length; ++index) {
                nucleotide.index = index;

                if (!monomerSet.isSet(index)) {
                    continue;
                }
                const pickingIdx = index;
                const j = i * 3;

                let bbHeight: Vector3 = nucleotide.baseShortAxis.clone().normalize().multiplyScalar(boxWidth);
                let bbDepth: Vector3 = nucleotide.baseNormal.clone().normalize();

                const bbCenter = nucleotide.backboneCenterToVector(tmpVec);
                naSpheres.position[j] = bbCenter.x;
                naSpheres.position[j + 1] = bbCenter.y;
                naSpheres.position[j + 2] = bbCenter.z;

                colormaker.colorToArray(colormaker.monomerColor(nucleotide), naSpheres.color, j);

                naSpheres.picking[i] = pickingIdx;

                const nbCenter = nucleotide.nucleobaseCenterToVector(tmpVec);
                naBoxes.position[j] = nbCenter.x;
                naBoxes.position[j + 1] = nbCenter.y;
                naBoxes.position[j + 2] = nbCenter.z;
                naBoxes.heightAxis[j] = bbHeight.x;
                naBoxes.heightAxis[j + 1] = bbHeight.y;
                naBoxes.heightAxis[j + 2] = bbHeight.z;
                naBoxes.depthAxis[j] = bbDepth.x;
                naBoxes.depthAxis[j + 1] = bbDepth.y;
                naBoxes.depthAxis[j + 2] = bbDepth.z;
                naBoxes.size[i] = nucleotide.isPurine() ? boxRadiusR : boxRadiusY;

                if (index - 1 === lastIndex) {
                    const cylinder_j = cylinder_i * 3;
                    CgStructureMonomerRepresentation.copyForSegment(
                        naSpheres.position, naBackboneCylinders.position1, naBackboneCylinders.position2, j, cylinder_j);
                    CgStructureMonomerRepresentation.copyForSegment(
                        naSpheres.color, naBackboneCylinders.color1, naBackboneCylinders.color2, j, cylinder_j);
                    naBackboneCylinders.picking[cylinder_i++] = pickingIdx - 1;
                }

                lastIndex = index;
                ++i;
            }

            if (includeCyclicBond) {
                const cylinder_j = cylinder_i * 3;

                naBackboneCylinders.position1.set(strand.threePrime!.backboneCenter.toArray(),
                    cylinder_j);

                naBackboneCylinders.position2.set(strand.fivePrime!.backboneCenter.toArray(),
                    cylinder_j);

                colormaker.colorToArray(
                    colormaker.monomerColor(strand.threePrime!),
                    naBackboneCylinders.color1,
                    cylinder_j);

                colormaker.colorToArray(
                    colormaker.monomerColor(strand.fivePrime!),
                    naBackboneCylinders.color2,
                    cylinder_j);

                naBackboneCylinders.picking[cylinder_i] = strand.length - 1;

                ++cylinder_i;
            }
        });

        i = 0;
        cylinder_i = 0;
        this.cgStructure.forEachAaChain(chain => {
            if (chain.length <= 0) return;

            const monomerSet = this._monomerSetDict.get(chain.globalId);
            if (monomerSet === undefined) {
                console.error("Cannot render following chain, no monomer set:", chain);
                return;
            }
            const includeCyclicBond = CgStructureMonomerRepresentation.includeCyclicBond(chain, monomerSet);

            let lastIndex: null | number = null;
            let aminoAcid = chain.getMonomerProxyTemplate();

            for (let index = 0; index < chain.length; ++index) {
                aminoAcid.index = index;

                if (!monomerSet.isSet(index)) {
                    continue;
                }
                const pickingIdx = index;
                const j = i * 3;

                const caPosition = aminoAcid.alphaCarbonLocationToVector(tmpVec);
                aaSpheres.position[j] = caPosition.x;
                aaSpheres.position[j + 1] = caPosition.y;
                aaSpheres.position[j + 2] = caPosition.z;

                colormaker.colorToArray(colormaker.monomerColor(aminoAcid), aaSpheres.color, j);

                aaSpheres.picking[i] = pickingIdx;

                if (index - 1 === lastIndex) {
                    const cylinder_j = cylinder_i * 3;
                    CgStructureMonomerRepresentation.copyForSegment(
                        aaSpheres.position, aaCylinders.position1, aaCylinders.position2, j, cylinder_j);
                    CgStructureMonomerRepresentation.copyForSegment(
                        aaSpheres.color, aaCylinders.color1, aaCylinders.color2, j, cylinder_j);
                    aaCylinders.picking[cylinder_i++] = pickingIdx - 1;
                }
                lastIndex = index;

                ++i;
            }

            if (includeCyclicBond) {
                const cylinder_j = cylinder_i * 3;

                aaCylinders.position1.set(chain.cTerm!.alphaCarbonLocation.toArray(),
                    cylinder_j);

                aaCylinders.position2.set(chain.nTerm!.alphaCarbonLocation.toArray(),
                    cylinder_j);

                colormaker.colorToArray(
                    colormaker.monomerColor(chain.cTerm!),
                    aaCylinders.color1,
                    cylinder_j);

                colormaker.colorToArray(
                    colormaker.monomerColor(chain.nTerm!),
                    aaCylinders.color2,
                    cylinder_j);

                aaCylinders.picking[cylinder_i] = chain.length - 1;

                ++cylinder_i;
            }
        });

        // Creating pickers & final buffers

        let naPicker: CgNucleotidePicker = new CgNucleotidePicker(naSpheres.picking, naPickerPolymers, naPickerMonCounts);
        let naStickPicker: CgNucleotideBondPicker = new CgNucleotideBondPicker(naBackboneCylinders.picking, naPickerPolymers, naPickerBondCounts);

        buffers.push(BufferCreator.createCylinderStripBufferFromArrays(
            naBackboneCylinders.position1, naBackboneCylinders.position2, naBackboneCylinders.color1,
            naBackboneCylinders.color2, naBackboneCylinders.radius, naStickPicker, true, undefined, undefined, {
            matrix: this.matrix
        }) as CylinderImpostorBuffer);

        buffers.push(BufferCreator.createSphereBufferFromArrays(
            naSpheres.position, naSpheres.color, naSpheres.radius, naPicker, undefined, undefined, {
            matrix: this.matrix
        }) as SphereImpostorBuffer);

        buffers.push(BufferCreator.createBoxBufferFromArrays(
            naBoxes.position, naBoxes.color, naBoxes.heightAxis,
            naBoxes.depthAxis, naBoxes.size, naPicker, {
            matrix: this.matrix
        }));

        buffers.push(BufferCreator.createCylinderStripBufferFromArrays(
            naBaseCylinders.position1, naBaseCylinders.position2, naBaseCylinders.color1,
            naBaseCylinders.color2, naBaseCylinders.radius, naPicker, false, undefined, undefined, {
            matrix: this.matrix
        }) as CylinderImpostorBuffer);

        let aaPicker: CgAminoAcidPicker = new CgAminoAcidPicker(aaSpheres.picking, aaPickerPolymers, aaPickerMonCounts);
        let aaStickPicker: CgAminoAcidBondPicker = new CgAminoAcidBondPicker(aaCylinders.picking, aaPickerPolymers, aaPickerBondCounts);

        buffers.push(BufferCreator.createCylinderStripBufferFromArrays(
            aaCylinders.position1, aaCylinders.position2, aaCylinders.color1,
            aaCylinders.color2, aaCylinders.radius, aaStickPicker, true, undefined, undefined, {
            matrix: this.matrix
        }) as CylinderImpostorBuffer);

        buffers.push(BufferCreator.createSphereBufferFromArrays(
            aaSpheres.position, aaSpheres.color, aaSpheres.radius, aaPicker, undefined, undefined, {
            matrix: this.matrix
        }) as SphereImpostorBuffer);

        return buffers;
    }

    protected getType(): string {
        return "monomer";
    }
}

CoarseGrainedRepresentationRegistry.add("monomer", CgStructureMonomerRepresentation);

export default CgStructureMonomerRepresentation;