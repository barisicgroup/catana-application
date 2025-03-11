import { Matrix4, Vector3 } from "three";
import Buffer from "../../../buffer/buffer";
import { CgMonomerProxy } from "../../../catana";
import { CoarseGrainedRepresentationRegistry, ColormakerRegistry } from "../../../globals";
import { RepresentationParameters } from "../../../representation/representation";
import RadiusFactory from "../../../utils/radius-factory";
import Viewer from "../../../viewer/viewer";
import CgAminoAcidChain from "../../data_model/cg-amino-acid-chain";
import CgNucleicAcidStrand from "../../data_model/cg-nucleic-acid-strand";
import CgStructure from "../../data_model/cg-structure";
import BufferCreator from "../../geometry/buffer-creator";
import NucleicAcidStructuresProvider from "../../nanomodeling/structure-providers/nucleic-acid-structures-provider";
import { CgAminoAcidPicker } from "../../picker/cg-amino-acid-picker";
import { CgNucleotidePicker } from "../../picker/cg-nucleotide-picker";
import { CgStructureRepresentation } from "./cg-structure-representation";

export class DoubleStrandRepresentationConstants {
    public static BP_SPHERE_RADIUS = 10.0;
}

/**
 * Double-strand representation focuses on emphasis of double-stranded segments.
 * It is based on underlying base-pairing information.
 */
export class CgStructureDoubleStrandRepresentation extends CgStructureRepresentation {
    public constructor(cgStructure: CgStructure, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(cgStructure, viewer, params);
    }

    public init(params: Partial<RepresentationParameters>) {
        let p: any = params ?? {};

        p.colorScheme = p.colorScheme ?? "chainname";
        p.colorScale = p.colorScale ?? "RdYlBu";

        // Base-pairs are automatically computed during the first initialization
        // of the representation
        this.cgStructure.generateBasePairs();

        this._filter.signals.stringChanged.add(() => {
            this.update();
        });
        super.init(params);
    }

    // TODO Add update(...) implementation for faster update of the representation

    protected createBuffers(): Buffer[] {
        const buffers: Array<Buffer> = new Array<Buffer>();
        const colormaker = ColormakerRegistry.getScheme(this.getColorParams());
        const radiusFactory = new RadiusFactory();

        const basePairBallRadius = DoubleStrandRepresentationConstants.BP_SPHERE_RADIUS;
        const naBallRadius = this.cgStructure.naStrandsCount > 0 && this.cgStructure.naStrands[0].length > 0 ?
            radiusFactory.cgMonomerRadius(this.cgStructure.naStrands[0].fivePrime!) : 0;
        const aaBallRadius = this.cgStructure.aaChainsCount > 0 && this.cgStructure.aaChains[0].length > 0 ?
            radiusFactory.cgMonomerRadius(this.cgStructure.aaChains[0].nTerm!) : 0;

        const naPickerPolymers: CgNucleicAcidStrand[] = [];
        const naPickerMonCounts: number[] = [];

        const aaPickerPolymers: CgAminoAcidChain[] = [];
        const aaPickerMonCounts: number[] = [];

        const ntMap = NucleicAcidStructuresProvider.nucleicAcidStructures;
        const nbBasis: Matrix4 = new Matrix4();
        let nbHydrAxis: Vector3 = new Vector3();
        let nbNormal: Vector3 = new Vector3();

        // Precompute the size of the buffers        
        let nSpheres: number = 0;

        this.cgStructure.forEachNaStrand(strand => {
            let included: number = 0;

            strand.forEachNucleotide(np => {
                let pair = np.pairedNucleotide;

                if ((this.includeMonomer(np) || (pair && this.includeMonomer(pair)) && (!pair || np.globalId > pair.globalId))) {
                    ++included;
                }
            });

            if (included > 0) {
                nSpheres += included;
                naPickerPolymers.push(strand);
                naPickerMonCounts.push(included);
            }
        });

        let naSpheres = {
            position: new Float32Array(nSpheres * 3),
            color: new Float32Array(nSpheres * 3),
            radius: new Float32Array(nSpheres),
            picking: new Uint32Array(nSpheres),
        }

        nSpheres = 0;

        this.cgStructure.forEachAaChain(chain => {
            let included: number = 0;

            chain.forEachAminoAcid(aa => {
                if (this.includeMonomer(aa)) {
                    ++included;
                }
            });

            if (included > 0) {
                nSpheres += included;
                aaPickerPolymers.push(chain);
                aaPickerMonCounts.push(included);
            }
        });

        let aaSpheres = {
            position: new Float32Array(nSpheres * 3),
            color: new Float32Array(nSpheres * 3),
            radius: new Float32Array(nSpheres),
            picking: new Uint32Array(nSpheres),
        }

        // Compute buffers content
        let i = 0;
        let col = new Float32Array(6);
        this.cgStructure.forEachNaStrand(strand => {
            const strMap = ntMap.get(strand.naType);

            strand.forEachNucleotide(np => {
                let pair = np.pairedNucleotide;

                if ((this.includeMonomer(np) || (pair && this.includeMonomer(pair)) && (!pair || np.globalId > pair.globalId))) {
                    const j = i * 3;

                    np.baseNormalToVector(nbNormal);
                    np.hydrogenFaceDirToVector(nbHydrAxis);

                    nbBasis.makeBasis(np.baseShortAxis, nbHydrAxis, nbNormal);

                    const refData = strMap?.get(np.nucleobaseType);
                    let pos: Vector3;

                    if (pair) {
                        if (refData) {
                            const nbcToOr = refData.originToBaseCenter.clone().applyMatrix4(nbBasis).negate();
                            pos = np.nucleobaseCenter.add(nbcToOr);
                        } else {
                            pos = np.nucleobaseCenter.clone().add(pair.nucleobaseCenter).multiplyScalar(0.5);
                        }
                    } else {
                        pos = np.backboneCenter;
                    }

                    naSpheres.position[j] = pos.x;
                    naSpheres.position[j + 1] = pos.y;
                    naSpheres.position[j + 2] = pos.z;

                    if (pair) {
                        colormaker.colorToArray(colormaker.monomerColor(np), col, 0);
                        colormaker.colorToArray(colormaker.monomerColor(pair), col, 3);

                        naSpheres.color[j] = 0.5 * (col[0] + col[3]);
                        naSpheres.color[j + 1] = 0.5 * (col[1] + col[4]);
                        naSpheres.color[j + 2] = 0.5 * (col[2] + col[5]);

                        naSpheres.radius[i] = basePairBallRadius;
                    } else {
                        colormaker.colorToArray(colormaker.monomerColor(np), naSpheres.color, j);
                        naSpheres.radius[i] = naBallRadius;
                    }

                    // NOTE In case of double-stranded sphere,
                    //      the picking ID always refers only to one of the nucleotides
                    naSpheres.picking[i] = np.index;

                    ++i;
                }
            });
        });

        i = 0;
        this.cgStructure.forEachAaChain(chain => {
            chain.forEachAminoAcid(aa => {
                if (this.includeMonomer(aa)) {
                    const pos = aa.position;
                    const j = i * 3;

                    aaSpheres.position[j] = pos.x;
                    aaSpheres.position[j + 1] = pos.y;
                    aaSpheres.position[j + 2] = pos.z;

                    colormaker.colorToArray(colormaker.monomerColor(aa), aaSpheres.color, j);

                    aaSpheres.radius[i] = aaBallRadius;
                    aaSpheres.picking[i] = aa.index;

                    ++i;
                }
            });
        });

        // Create pickers and buffers
        let naPicker = new CgNucleotidePicker(naSpheres.picking, naPickerPolymers, naPickerMonCounts);
        let aaPicker = new CgAminoAcidPicker(aaSpheres.picking, aaPickerPolymers, aaPickerMonCounts);

        buffers.push(BufferCreator.createSphereBufferFromArrays(
            naSpheres.position, naSpheres.color, naSpheres.radius, naPicker, undefined, undefined, {
            matrix: this.matrix
        }));

        buffers.push(BufferCreator.createSphereBufferFromArrays(
            aaSpheres.position, aaSpheres.color, aaSpheres.radius, aaPicker, undefined, undefined, {
            matrix: this.matrix
        }));

        return buffers;
    }

    protected getType(): string {
        return "double-strand";
    }

    private includeMonomer(mon: CgMonomerProxy): boolean {
        return this._filter.isAllFilter() ||
            !this._filter.cgMonomerTest
            // Only double equality (==) below is intentional
            || (this._filter.cgMonomerTest && this._filter.cgMonomerTest(mon) == true);
    }
}

CoarseGrainedRepresentationRegistry.add("double-strand", CgStructureDoubleStrandRepresentation);

export default CgStructureDoubleStrandRepresentation;