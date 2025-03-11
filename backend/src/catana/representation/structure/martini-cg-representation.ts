import { ResidueProxy } from "../../../catana";
import { ColormakerRegistry, RepresentationRegistry } from "../../../globals";
import StructureRepresentation, { StructureRepresentationData, StructureRepresentationParameters } from "../../../representation/structure-representation";
import Structure from "../../../structure/structure";
import StructureView from "../../../structure/structure-view";
import { defaults } from "../../../utils";
import { AtomPicker } from "../../../utils/picker";
import Viewer from "../../../viewer/viewer";
import BufferCreator from "../../geometry/buffer-creator";

// Arrays defining names for Martini CG model beads ("coarse-grained atoms").
// Order of elements in these arrays matters!

const NA_BACKBONE_ATOMS = ["BB1", "BB2", "BB3"];
const NA_BASE_ATOMS = ["SC1", "SC2", "SC3", "SC4"]; // SC4 is present only in purines
const NA_ATOMS = [...NA_BACKBONE_ATOMS, ...NA_BASE_ATOMS];

const PROT_BACKBONE_ATOMS = ["BB"];
const PROT_SIDECHAIN_ATOMS = ["SC1", "SC2", "SC3", "SC4"]; // AA may have one to four sidechain beads 
const PROT_ATOMS = [...PROT_BACKBONE_ATOMS, ...PROT_SIDECHAIN_ATOMS];

/**
 * Representation developed specifically for the visualization of 
 * Martini Coarse-grained Force Field structures.
 * 
 * @see https://doi.org/10.1021/acs.jctc.5b00286
 * @see https://www.cell.com/cms/10.1016/j.bpj.2017.05.043/attachment/f9692cae-c249-46cf-bd15-92ce3c0b4727/mmc1
 * @see https://pubs.acs.org/doi/full/10.1021/ct700324x
 * @see http://cgmartini.nl/index.php/tutorials-general-introduction-gmx5/others-gmx5
 */
export default class MartiniCgRepresentation extends StructureRepresentation {
    constructor(structure: Structure, viewer: Viewer, params: Partial<StructureRepresentationParameters>) {
        super(structure, viewer, params);

        this.type = "martini-cg";

        this.parameters = Object.assign({
            sphereDetail: true,
            disableImpostor: true
        }, this.parameters);

        this.init(params);
    }

    public init(params: Partial<StructureRepresentationParameters>) {
        var p = params ?? {};
        p.useInteriorColor = defaults(p.useInteriorColor, true);
        p.colorScheme = defaults(p.colorScheme, "resname");

        super.init(p);
    }

    public createData(sview: StructureView): StructureRepresentationData {
        const colormaker = ColormakerRegistry.getScheme(this.getColorParams());
        const beadsBaseRadius = 0.5; // Empirically defined value
        const cylindersRadius = 0.8 * beadsBaseRadius; // Empirically defined value

        let beadsCounts: number = 0;
        let cylindersCounts: number = 0;

        // TODO There is quite a bunch of duplicated code in the NA and protein processing functions

        this.processCgData(sview, rp => {
            rp.eachAtom(ap => {
                let thisBeadsCnt = 0;
                if (NA_ATOMS.indexOf(ap.atomname) >= 0) {
                    ++thisBeadsCnt;
                }

                beadsCounts += thisBeadsCnt;
                // We have a nucleobase cycle (|V|=|E|), backbone path (|V|-1=|E|) 
                // and one edge (+1) connecting backbone and base
                cylindersCounts += thisBeadsCnt;
            });
        }, rp => {
            rp.eachAtom(ap => {
                let thisBeadsCnt = 0;
                if (PROT_ATOMS.indexOf(ap.atomname) >= 0) {
                    ++thisBeadsCnt;
                }

                if (thisBeadsCnt > 0) {
                    beadsCounts += thisBeadsCnt;

                    // Side chain beads may consist solely of a path or also include
                    // cycles, depending on the size of the side chain.
                    if (beadsCounts < 4) {
                        cylindersCounts += thisBeadsCnt - 1;
                    } else if (beadsCounts === 4) {
                        cylindersCounts += thisBeadsCnt;
                    } else {
                        cylindersCounts += thisBeadsCnt + 1;
                    }
                }
            })
        });

        let beads = {
            position: new Float32Array(beadsCounts * 3),
            color: new Float32Array(beadsCounts * 3),
            radius: new Float32Array(beadsCounts).fill(beadsBaseRadius),
            picking: new Float32Array(beadsCounts)
        }

        let cylinders = {
            position1: new Float32Array(cylindersCounts * 3),
            position2: new Float32Array(cylindersCounts * 3),
            color1: new Float32Array(cylindersCounts * 3),
            color2: new Float32Array(),
            radius: new Float32Array(cylindersCounts).fill(cylindersRadius),
        }
        cylinders.color2 = cylinders.color1;

        const naAtomsIndices = new Array<number>(NA_ATOMS.length);
        const protAtomsIndices = new Array<number>(PROT_ATOMS.length);

        let beadsIdx = 0;
        let cylindersIdx = 0;
        this.processCgData(sview, rp => {
            naAtomsIndices.fill(-1);

            rp.eachAtom(ap => {
                const atIdx = NA_ATOMS.indexOf(ap.atomname);
                if (atIdx >= 0) {
                    beads.position[3 * beadsIdx] = ap.x;
                    beads.position[3 * beadsIdx + 1] = ap.y;
                    beads.position[3 * beadsIdx + 2] = ap.z;

                    colormaker.atomColorToArray(
                        ap,
                        beads.color,
                        3 * beadsIdx
                    );

                    beads.picking[beadsIdx] = ap.index;

                    ++beadsIdx;
                    naAtomsIndices[atIdx] = ap.index;
                }
            });

            for (let i = 0; i < naAtomsIndices.length; ++i) {
                const thisIdx = naAtomsIndices[i];

                if (thisIdx < 0) {
                    continue;
                }

                // SC4 might not be present but if it is, it is connected to SC1, 
                // otherwise SC3 is connected to SC1
                const nextIdx =
                    (i + 1 < naAtomsIndices.length && naAtomsIndices[i + 1] >= 0) ?
                        naAtomsIndices[i + 1] : naAtomsIndices[NA_BACKBONE_ATOMS.length];

                const thisAp = sview.getAtomProxy(thisIdx);
                const nextAp = sview.getAtomProxy(nextIdx);

                cylinders.position1[3 * cylindersIdx] = thisAp.x;
                cylinders.position1[3 * cylindersIdx + 1] = thisAp.y;
                cylinders.position1[3 * cylindersIdx + 2] = thisAp.z;

                cylinders.position2[3 * cylindersIdx] = nextAp.x;
                cylinders.position2[3 * cylindersIdx + 1] = nextAp.y;
                cylinders.position2[3 * cylindersIdx + 2] = nextAp.z;

                colormaker.atomColorToArray(
                    thisAp,
                    cylinders.color1,
                    3 * cylindersIdx
                );

                ++cylindersIdx;
            }
        }, rp => {
            protAtomsIndices.fill(-1);

            rp.eachAtom(ap => {
                const atIdx = PROT_ATOMS.indexOf(ap.atomname);
                if (atIdx >= 0) {
                    beads.position[3 * beadsIdx] = ap.x;
                    beads.position[3 * beadsIdx + 1] = ap.y;
                    beads.position[3 * beadsIdx + 2] = ap.z;

                    colormaker.atomColorToArray(
                        ap,
                        beads.color,
                        3 * beadsIdx
                    );

                    beads.picking[beadsIdx] = ap.index;

                    ++beadsIdx;
                    protAtomsIndices[atIdx] = ap.index;
                }
            });

            for (let i = 0; i < protAtomsIndices.length; ++i) {
                const thisIdx = protAtomsIndices[i];

                // one- or two-beaded side chains do not contain a cycle,
                // thus the last bead is ignored for cylinders addition
                if (thisIdx < 0 || (i < 3 && protAtomsIndices[i + 1] < 0)) {
                    continue;
                }

                // By default, next index points to the following atom proxy in list if valid
                let nextIdx =
                    (i + 1 < protAtomsIndices.length && protAtomsIndices[i + 1] >= 0) ?
                        protAtomsIndices[i + 1] : -1;

                if (i === PROT_ATOMS.length - 2 && protAtomsIndices[i + 1] < 0) {
                    nextIdx = protAtomsIndices[PROT_BACKBONE_ATOMS.length];
                } else if (i === PROT_ATOMS.length - 1) {
                    nextIdx = protAtomsIndices[PROT_BACKBONE_ATOMS.length + 1];
                }

                const thisAp = sview.getAtomProxy(thisIdx);
                const nextAp = sview.getAtomProxy(nextIdx);

                cylinders.position1[3 * cylindersIdx] = thisAp.x;
                cylinders.position1[3 * cylindersIdx + 1] = thisAp.y;
                cylinders.position1[3 * cylindersIdx + 2] = thisAp.z;

                cylinders.position2[3 * cylindersIdx] = nextAp.x;
                cylinders.position2[3 * cylindersIdx + 1] = nextAp.y;
                cylinders.position2[3 * cylindersIdx + 2] = nextAp.z;

                colormaker.atomColorToArray(
                    thisAp,
                    cylinders.color1,
                    3 * cylindersIdx
                );

                ++cylindersIdx;
            }

            // For large side chains, one more cylindrical bond (between SC1 and SC3) has to be added
            // to correspond with the MARTINI's description
            if (protAtomsIndices[protAtomsIndices.length - 1] >= 0) {
                const thisAp = sview.getAtomProxy(protAtomsIndices[PROT_BACKBONE_ATOMS.length]);
                const nextAp = sview.getAtomProxy(protAtomsIndices[PROT_BACKBONE_ATOMS.length + 2]);

                cylinders.position1[3 * cylindersIdx] = thisAp.x;
                cylinders.position1[3 * cylindersIdx + 1] = thisAp.y;
                cylinders.position1[3 * cylindersIdx + 2] = thisAp.z;

                cylinders.position2[3 * cylindersIdx] = nextAp.x;
                cylinders.position2[3 * cylindersIdx + 1] = nextAp.y;
                cylinders.position2[3 * cylindersIdx + 2] = nextAp.z;

                colormaker.atomColorToArray(
                    thisAp,
                    cylinders.color1,
                    3 * cylindersIdx
                );

                ++cylindersIdx;
            }
        });

        const beadsPicker = new AtomPicker(beads.picking, sview);

        return {
            bufferList: [
                BufferCreator.
                    createSphereBufferFromArrays(
                        beads.position,
                        beads.color,
                        beads.radius,
                        beadsPicker
                    ),
                BufferCreator.
                    createCylinderStripBufferFromArrays(
                        cylinders.position1,
                        cylinders.position2,
                        cylinders.color1,
                        cylinders.color2,
                        cylinders.radius
                    )
            ]
        };
    }

    public processCgData(sview: StructureView, naCallback: (rp: ResidueProxy) => void,
        protCallback: (rp: ResidueProxy) => void) {
        sview.eachResidue(rp => {
            if (rp.isNucleic()) {
                naCallback(rp);
            } else if (rp.isProtein()) {
                protCallback(rp);
            }
            // TODO How to deal with other types of molecules (ligands, ...)?
        });
    }
}

RepresentationRegistry.add("martini-cg", MartiniCgRepresentation);