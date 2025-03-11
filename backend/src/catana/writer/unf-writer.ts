import md5 from "blueimp-md5";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import StructureComponent from "../../component/structure-component";
import { PdbWriter, Structure } from "../../catana";
import Writer from "../../writer/writer";
import CgStructureComponent from "../component/cg-structure-component";
import CgStructure from "../data_model/cg-structure";
import { aminoAcidTypeToThreeLetterCode, monomerTypeToOneLetterCode } from "../data_model/types_declarations/monomer-types";
import { nucleicAcidTypeToString } from "../data_model/types_declarations/polymer-types";
import GlobalIdGenerator from "../utils/global-id-generator";
import { VisualizationProperties } from "../utils/multi-objects-storage";
import { ColormakerRegistry } from "../../globals";

/**
 * Customizable parameters for the UNF Writer
 */
export interface UnfWriterParams {
    /**
     * Name of the exported structure / UNF file content ('name' value in the root of the UNF file)
     */
    strucName: string,
    /**
     * Name of the file author
     */
    authorName: string,
    /**
     * Determines whether the global IDs should be renumbered when exporting the file or not.
     * If set to true, the IDs will start at zero and will be sequentially increased for each new exported object.
     */
    renumberIds: boolean
}

/**
 * Writer exporting UNF files
 * @see [Unified Nanotechnology Format](https://github.com/barisicgroup/unf)
 */
export default class UnfWriter extends Writer {
    public readonly mimeType = "text/plain";
    public readonly defaultName = "nanostructure";
    public readonly defaultExt = "unf";
    public readonly exportedUnfVersion = "1.0.0";

    private readonly _structuresToExport: (StructureComponent | CgStructureComponent)[];
    private readonly _unfObject: any;

    private _includedStructuresData: string;
    private _idGenerator: number;
    private _renumberIds: boolean;
    private _idMap: Map<number, number>;
    private _idToVisProp: Map<number, VisualizationProperties>;

    /**
     * @param structuresToExport structure components to be exported
     * @param params writer parameters
     */
    public constructor(structuresToExport: (StructureComponent | CgStructureComponent)[], params: Partial<UnfWriterParams> = {}) {
        super();

        const renumberIds = params.renumberIds ?? false;
        const sName = params.strucName ?? "Nanostructure";
        const aName = params.authorName ?? "Catana";

        this._renumberIds = renumberIds;
        this._idMap = new Map();
        this._idToVisProp = new Map();

        this._structuresToExport = structuresToExport;
        this._unfObject = this.initUnfObject(sName, aName, structuresToExport.length);
        this._includedStructuresData = "";
        this._idGenerator = renumberIds ? 0 : (GlobalIdGenerator.currentState + 1);
    }

    /** @override */
    public getData(): string {
        this.processStructuresToExport();
        this.finalizeUnfObject();

        // First, the core JSON part of the UNF is appended, followed by the
        // content of all included files
        return JSON.stringify(this._unfObject) + "\n" + this._includedStructuresData;
    }

    /**
     * Initializes empty UNF object
     * 
     * @returns object with the same structure as UNF's JSON
     */
    private initUnfObject(storedStructureName: string, authorName: string, strucsToExportCnt: number): any {
        let unfFileData: any = {}

        unfFileData.format = "unf";
        unfFileData.version = this.exportedUnfVersion;
        unfFileData.lengthUnits = "A";
        unfFileData.angularUnits = "deg";
        unfFileData.name = storedStructureName;
        unfFileData.author = authorName;
        unfFileData.creationDate = new Date().toISOString();
        unfFileData.doi = "NULL";
        unfFileData.simData = {};
        unfFileData.simData.boxSize = [];
        unfFileData.externalFiles = []
        unfFileData.lattices = []
        unfFileData.structures = []
        unfFileData.groups = []
        unfFileData.connections = []
        unfFileData.modifications = []
        unfFileData.comments = []
        unfFileData.misc = {}
        unfFileData.molecules = {}
        unfFileData.molecules.ligands = []
        unfFileData.molecules.nanostructures = []
        unfFileData.molecules.others = []

        return unfFileData;
    }

    /**
     * Finalizes the data of the internal UNF object
     */
    private finalizeUnfObject() {
        this.appendCatanaSceneData();

        this._unfObject.idCounter = this._idGenerator + 1;
    }

    /**
     * Computes a MD5 hash of the source string with all of its line ends removed
     */
    private computeHash(stringContent: string): string {
        return md5(stringContent.replace(/(\r\n|\n|\r)/gm, ""));
    }

    /**
     * Goes through structures to be exported and appends them to the internal UNF object
     */
    private processStructuresToExport(): void {
        this._structuresToExport.forEach(strucComp => {
            if (strucComp instanceof StructureComponent) {
                this.appendAllAtomStructure(strucComp, strucComp.structure, strucComp.position,
                    new Euler().setFromQuaternion(strucComp.quaternion));
            } else {
                this.appendCoarseGrainedStructure(strucComp, strucComp.cgStructure, strucComp.matrix, strucComp.quaternion);
            }
        });
    }

    /**
     * Appends all-atom structure to the UNF data
     */
    private appendAllAtomStructure(comp: StructureComponent, structure: Structure, position: Vector3, rotation: Euler): void {
        const externalFileId = this._idGenerator++;
        const moleculeId = this._idGenerator++;
        const structureName = structure.name;
        const externalFilePath = externalFileId + "-" + structureName;

        const pdbWriter = new PdbWriter(structure);
        const pdbContent = pdbWriter.getData();
        const pdbContentHash = this.computeHash(pdbContent);

        // Modify JSON core
        const exFileRecord: any = {};
        exFileRecord.id = externalFileId;
        exFileRecord.path = externalFilePath;
        exFileRecord.isIncluded = true;
        exFileRecord.hash = pdbContentHash;

        this._unfObject.externalFiles.push(exFileRecord);

        const moleculeRecord: any = {};
        moleculeRecord.id = moleculeId;
        moleculeRecord.name = structureName;
        moleculeRecord.externalFileId = externalFileId;
        moleculeRecord.positions = [position.toArray()];
        moleculeRecord.orientations = [rotation.toArray().slice(0, 3)];

        this._unfObject.molecules.others.push(moleculeRecord);

        this.addNewVisProperty(moleculeId, comp);

        // Modify included files string
        this._includedStructuresData +=
            "#INCLUDED_FILE " + externalFilePath + "\n" + pdbContent + "\n";
    }

    /**
     * Appends coarse-grained structure to the UNF data
     */
    private appendCoarseGrainedStructure(comp: CgStructureComponent, cgStructure: CgStructure, matrix: Matrix4, rotation: Quaternion): void {
        const newStructure: any = {}
        newStructure.id = this.getGlobalId(cgStructure.globalId);
        newStructure.name = cgStructure.name;
        newStructure.naStrands = [];
        newStructure.aaChains = [];

        cgStructure.forEachNaStrand(naStrand => {
            if (naStrand.length === 0) {
                return;
            }

            const newNaStrand: any = {};
            newNaStrand.id = this.getGlobalId(naStrand.globalId);
            newNaStrand.name = naStrand.name;
            newNaStrand.isScaffold = naStrand.isScaffold;
            newNaStrand.naType = nucleicAcidTypeToString(naStrand.naType);
            newNaStrand.color = naStrand.customColor ? ("#" + naStrand.customColor.getHexString()) : "";
            newNaStrand.fivePrimeId = this.getGlobalId(naStrand.fivePrime!.globalId);
            newNaStrand.threePrimeId = this.getGlobalId(naStrand.threePrime!.globalId);
            newNaStrand.pdbFileId = -1;
            newNaStrand.chainName = naStrand.name;
            newNaStrand.nucleotides = [];

            naStrand.forEachNucleotide(nucl => {
                const newNucl: any = {};
                newNucl.id = this.getGlobalId(nucl.globalId);
                newNucl.nbAbbrev = monomerTypeToOneLetterCode(nucl.nucleobaseType);
                newNucl.pair = nucl.pairedNucleotide ? this.getGlobalId(nucl.pairedNucleotide.globalId) : -1;
                newNucl.prev = nucl.index === 0 ?
                    (naStrand.isCircular ? this.getGlobalId(naStrand.threePrime!.globalId) : -1) :
                    this.getGlobalId(naStrand.getNucleotideProxy(nucl.index - 1)!.globalId);
                newNucl.next = nucl.index === naStrand.length - 1 ?
                    (naStrand.isCircular ? this.getGlobalId(naStrand.fivePrime!.globalId) : -1) :
                    this.getGlobalId(naStrand.getNucleotideProxy(nucl.index + 1)!.globalId);
                newNucl.pdbId = -1;
                newNucl.altPositions = [
                    {
                        nucleobaseCenter: nucl.nucleobaseCenter.applyMatrix4(matrix).toArray(),
                        backboneCenter: nucl.backboneCenter.applyMatrix4(matrix).toArray(),
                        baseNormal: nucl.baseNormal.applyQuaternion(rotation).normalize().toArray(),
                        hydrogenFaceDir: nucl.hydrogenFaceDir.applyQuaternion(rotation).normalize().toArray()
                    }
                ];

                newNaStrand.nucleotides.push(newNucl);
            });

            newStructure.naStrands.push(newNaStrand);
        });

        cgStructure.forEachAaChain(aaChain => {
            if (aaChain.length === 0) {
                return;
            }

            const newAaChain: any = {};
            newAaChain.id = this.getGlobalId(aaChain.globalId);
            newAaChain.chainName = aaChain.name;
            newAaChain.color = aaChain.customColor ? ("#" + aaChain.customColor.getHexString()) : "";
            newAaChain.pdbFileId = -1;
            newAaChain.nTerm = this.getGlobalId(aaChain.nTerm!.globalId);
            newAaChain.cTerm = this.getGlobalId(aaChain.cTerm!.globalId);
            newAaChain.aminoAcids = [];

            aaChain.forEachAminoAcid(aa => {
                const newAa: any = {};

                newAa.id = this.getGlobalId(aa.globalId);
                newAa.secondary = "NULL";
                newAa.aaAbbrev = aminoAcidTypeToThreeLetterCode(aa.aminoAcidType);
                newAa.prev = aa.index === 0 ? -1 : this.getGlobalId(aaChain.getAminoAcidProxy(aa.index - 1)!.globalId);
                newAa.next = aa.index === aaChain.length - 1 ? -1 : this.getGlobalId(aaChain.getAminoAcidProxy(aa.index + 1)!.globalId);
                newAa.pdbId = -1;
                newAa.altPositions = [aa.alphaCarbonLocation.applyMatrix4(matrix).toArray()];

                newAaChain.aminoAcids.push(newAa);
            });

            newStructure.aaChains.push(newAaChain);
        });

        this.addNewVisProperty(newStructure.id, comp);

        this._unfObject.structures.push(newStructure);
    }

    /**
     * Returns global ID used in the exported file corresponding to the original global ID of the object
     * 
     * @param origGlobId original global ID
     * @returns global ID to be used in the UNF file
     */
    private getGlobalId(origGlobId: number): number {
        if (!this._renumberIds) {
            return origGlobId;
        }

        let newId = this._idMap.get(origGlobId);

        if (!newId) {
            this._idMap.set(origGlobId, this._idGenerator);
            return this._idGenerator++;
        }

        return newId;
    }

    /**
     * Catana-extension of the UNF format enabling to store some of the visualization
     * settings in the exported file.
     */
    private addNewVisProperty(id: number, c: StructureComponent | CgStructureComponent) {
        let colorSchemes: any[] = [];

        let structParams: any = {};
        if (c instanceof StructureComponent) {
            structParams.structure = c.structure;
        } else if (c instanceof CgStructureComponent) {
            structParams.cgStructure = c.cgStructure;
        }

        let schemeParams = c.reprList.map(x => ColormakerRegistry.getScheme(
            Object.assign({ scheme: x.repr.getColorParams().scheme }, structParams)
        )?.parameters);

        // Data lists may not be always initialized,
        // usually because there is only some default color scheme.
        // In this case, data list record is created based on default color scheme.
        schemeParams.forEach(x => {
            let dataList = x.dataList;

            if (!dataList) {
                dataList = [];

                let defaultScheme: any[] = [];

                defaultScheme.push(
                    x.scheme,
                    "*",
                    {
                        scale: x.scale,
                        scheme: x.scheme
                    }
                );

                dataList.push(defaultScheme);
            } else {
                dataList = dataList.map((y: any) => {
                    const res = [
                        y[0],
                        y[1]
                    ];

                    if (y.length > 2) {
                        res.push({
                            scale: y[2].scale,
                            scheme: y[2].scheme
                        });
                    }

                    return res;
                })
            }

            colorSchemes.push(dataList);
        });

        this._idToVisProp.set(id, {
            representations: c.reprList.map(x => x.name),
            filterStrings: c.reprList.map(x => x.repr.filterString),
            colorSchemes: colorSchemes
        })
    }

    /**
     * Appends Catana-only data to the UNF file
     */
    private appendCatanaSceneData(): void {
        const visProps: any = [];

        this._idToVisProp.forEach((val, key) => {
            visProps.push({
                id: key,
                data: val
            })
        });

        this._unfObject.misc.catanaData = {
            visProps: visProps
        };
    }
}