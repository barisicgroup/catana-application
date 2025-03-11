import { Color, Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { ParserRegistry } from '../../globals';
import { Log, RandomNaSequenceProvider, Structure } from '../../catana';
import Parser, { ParserParameters } from "../../parser/parser"
import PdbParser from '../../parser/pdb-parser';
import Streamer from "../../streamer/streamer";
import StringStreamer from '../../streamer/string-streamer';
import { CatanaState } from '../actions/catana-state';
import CgAminoAcidChain from '../data_model/cg-amino-acid-chain';
import CgNucleicAcidStrand from '../data_model/cg-nucleic-acid-strand';
import CgStructure from '../data_model/cg-structure';
import CgNucleotideProxy from '../data_model/proxy/cg-nucleotide-proxy';
import { getComplementaryBase, NucleobaseType, oneLetterCodeToNucleobaseType, threeLetterCodeToAminoAcidType } from '../data_model/types_declarations/monomer-types';
import { NucleicAcidStrandEnd, stringToNucleicAcidType } from '../data_model/types_declarations/polymer-types';
import { HoneycombLattice } from '../nanomodeling/lattices/honeycomb-lattice';
import Lattice from '../nanomodeling/lattices/lattice';
import { SquareLattice } from '../nanomodeling/lattices/square-lattice';
import GlobalIdGenerator from '../utils/global-id-generator';
import MultiObjectsStorage, { VisualizationProperties } from "../utils/multi-objects-storage";
import UnitsConverter, { AngularUnits, LengthUnits, stringToUnitType } from '../utils/units-converter';
import { defaults } from '../../utils';
import NucleicAcidStructuresProvider from '../nanomodeling/structure-providers/nucleic-acid-structures-provider';
import { isStructureInOxDnaGeometry, transformStructureFromOxDnaGeometry } from '../nanomodeling/nucleic-acid-utils';

/**
 * UNF parser parameters
 */
export interface UnfParserParams extends ParserParameters {
    /**
     * If set to true, nucleotides with "N" type will have random nucleobase assigned instead of "N"
     */
    overrideAnyNbTypeToRandom: boolean,
    /**
     * If set to true, the lattice-based structures will be centered at world origin
     */
    originAtCenterOfMass: boolean
}

/**
 * Parser processing UNF files
 * @see https://github.com/barisicgroup/unf
 */
class UnfParser extends Parser {
    // UNF can lso be seen as a storage of a "molecular scene"
    // in a way. Due to this, sceneData property is used.
    public sceneData: MultiObjectsStorage;

    private readonly supportedUnfVersion = "1.0";
    private overrideNtypeToRandom: boolean;
    private latticeOriginAtCenterOfMass: boolean;

    private lastProcessedJsonPart: string;
    private lastProcessedAllAtomStructures: Structure[];

    constructor(streamer: Streamer, params?: Partial<UnfParserParams>) {
        super(streamer, params);

        this.overrideNtypeToRandom = defaults(params?.overrideAnyNbTypeToRandom, true);
        this.latticeOriginAtCenterOfMass = defaults(params?.originAtCenterOfMass, true);
    }

    public get type(): string {
        return "unf";
    }

    public get __objName(): string {
        // This string determines the name of the attribute which will be returned 
        // by parser as an outcome of the parsing procedure.
        // See Parser.parse() for behind-the-scenes info.
        // Also, based on this, the type of data stored by this extension
        // is determined.
        return "sceneData";
    }

    public parse(): Promise<any> {
        return this.streamer.read()
            .then(this.processIncludedFiles.bind(this),
                reason => Promise.reject(reason))
            .then(this.parseProcessedFiles.bind(this),
                reason => Promise.reject(reason));
    }

    public _parse(): void {
        this.sceneData = new MultiObjectsStorage();

        const parsedJson = JSON.parse(this.lastProcessedJsonPart);
        const seqGen = new RandomNaSequenceProvider();

        // Checking for compatibility & processing file settings
        if (parsedJson.format !== "unf") {
            Log.error("This is not a valid UNF file.");
            return;
        }

        if (!String(parsedJson.version).match("^" + this.supportedUnfVersion)) {
            Log.error("Unsupported version of UNF: " + parsedJson.version);
            return;
        }

        GlobalIdGenerator.setStartingId(Math.max(Number(parsedJson.idCounter),
            GlobalIdGenerator.currentState));

        let lenUnit = stringToUnitType(parsedJson.lengthUnits);
        let angUnit = stringToUnitType(parsedJson.angularUnits);

        if (lenUnit === undefined || angUnit === undefined) {
            Log.error("Invalid UNF units: ", lenUnit, angUnit);

            lenUnit = LengthUnits.A;
            angUnit = AngularUnits.DEG;
        }

        const lenUnitsConv = new UnitsConverter(lenUnit, LengthUnits.A);
        const angUnitsConv = new UnitsConverter(angUnit, AngularUnits.DEG);

        let ntIdToVhelixCellPair = new Map<number, [any, any, any]>();

        // Processing lattices
        parsedJson.lattices.forEach((lattice: any) => {
            const LatClass = lattice.type === "square" ? SquareLattice : HoneycombLattice;
            let minRow = 256, maxRow = 0;
            let minCol = 256, maxCol = 0;

            const pos = new Vector3().fromArray(lenUnitsConv.convertArray(lattice.position));
            const rot = new Quaternion()
                .setFromEuler(
                    new Euler()
                        .fromArray(angUnitsConv.convertArray(lattice.orientation)));

            const newLattice = new LatClass(1, 1, CatanaState.dnaFactory.dnaForm.doubleHelixDiameter, new Matrix4()
                .makeTranslation(pos.x, pos.y, pos.z)
                .premultiply(new Matrix4().makeRotationFromQuaternion(rot)));
            const appendedIdx = this.sceneData.storedObjects.push(newLattice) - 1;
            this.sceneData.setComponentTransformation(appendedIdx, new Vector3(0, 0, 0), new Quaternion(0, 0, 0, 1));
            this.sceneData.setComponentVisibility(appendedIdx, false);

            let newCom = new Vector3(0, 0, 0);
            let elemCount = 0;

            lattice.virtualHelices.forEach((vhelix: any) => {
                minRow = Math.min(minRow, vhelix.latticePosition[0]);
                maxRow = Math.max(maxRow, vhelix.latticePosition[0]);

                minCol = Math.min(minCol, vhelix.latticePosition[1]);
                maxCol = Math.max(maxCol, vhelix.latticePosition[1]);

                vhelix.cells.forEach((cell: any) => {
                    cell.fiveToThreeNts.forEach((id: number) => {
                        ntIdToVhelixCellPair.set(id, [newLattice, vhelix, cell]);
                    });

                    cell.threeToFiveNts.forEach((id: number) => {
                        ntIdToVhelixCellPair.set(id, [newLattice, vhelix, cell]);
                    });

                    let thisPos = newLattice.getPosition(vhelix.latticePosition[0], vhelix.latticePosition[1], cell.number);
                    let thisCounts = cell.fiveToThreeNts.length + cell.threeToFiveNts.length;

                    for (let i = 0; i < thisCounts; ++i) {
                        newCom.add(thisPos);
                    }
                    elemCount += thisCounts;
                });
            });

            newLattice.resize(maxCol + 1, maxRow + 1);
            if (this.latticeOriginAtCenterOfMass) {
                newLattice.moveOriginToNewLocation(newCom.divideScalar(elemCount));
            }
        });

        // Processing coarse-grained structures
        parsedJson.structures.forEach((jsonStructure: any) => {
            const newCgStruc = new CgStructure(jsonStructure.id, jsonStructure.name);

            jsonStructure.naStrands.forEach((jsonStrand: any) => {
                const newNaStrand = new CgNucleicAcidStrand(jsonStrand.id,
                    (!jsonStrand.name || jsonStrand.name.length > 1 || jsonStrand.name.length === 0) ? newCgStruc.generateChainName() : jsonStrand.name,
                    stringToNucleicAcidType(jsonStrand.naType), newCgStruc,
                    jsonStrand.nucleotides.length);

                newNaStrand.customColor = new Color(jsonStrand.color);
                newNaStrand.isScaffold = jsonStrand.isScaffold ?? false;

                let currNuclId = jsonStrand.fivePrimeId as number;
                let currNucl: any;
                while (currNucl = jsonStrand.nucleotides.find((n: any) => n.id === currNuclId)) {
                    let nbType = oneLetterCodeToNucleobaseType(currNucl.nbAbbrev);

                    if (this.overrideNtypeToRandom && nbType === NucleobaseType.ANY) {
                        let compl = newCgStruc.getNucleotideProxy(currNucl.pair);

                        if (compl) {
                            nbType = getComplementaryBase(compl.nucleobaseType, newNaStrand.naType);
                        } else {
                            nbType = seqGen.getNext();
                        }

                    }

                    let newNucl: CgNucleotideProxy | undefined = undefined;
                    if (currNucl.altPositions.length > 0) {
                        newNucl = newNaStrand.insertNewThreePrimeNucleotide(currNucl.id,
                            nbType,
                            new Vector3().fromArray(
                                lenUnitsConv.convertArray(currNucl.altPositions[0].nucleobaseCenter)),
                            new Vector3().fromArray(
                                lenUnitsConv.convertArray(currNucl.altPositions[0].backboneCenter)),
                            new Vector3().fromArray(
                                currNucl.altPositions[0].baseNormal),
                            new Vector3().fromArray(
                                currNucl.altPositions[0].hydrogenFaceDir)
                        );
                    } else {
                        const nuclRec = ntIdToVhelixCellPair.get(currNucl.id);

                        if (nuclRec) {
                            newNucl = this.insertLatticeBasedNucleotide(newNaStrand,
                                currNucl.id,
                                nbType,
                                nuclRec[0],
                                nuclRec[1],
                                nuclRec[2],
                                angUnitsConv
                            );
                        } else {
                            Log.error("Nucleotide without position in space: ", currNucl.id);
                        }
                    }

                    if (newNucl) {
                        newNucl.pairId = currNucl.pair >= 0 ? currNucl.pair : -1;
                    }

                    currNuclId = currNucl.next;

                    // We reached the start nucleotide again, thus we have a circular strand
                    if (currNuclId === jsonStrand.fivePrimeId) {
                        newNaStrand.isCircular = true;
                        break;
                    }
                }

                if (newNaStrand.length === 0) {
                    newNaStrand.dispose();
                } else {
                    newCgStruc.addNaStrand(newNaStrand);
                }
            });

            jsonStructure.aaChains.forEach((jsonChain: any) => {
                const newAaChain = new CgAminoAcidChain(jsonChain.id, jsonChain.chainName ?? newCgStruc.generateChainName(),
                    newCgStruc, jsonChain.aminoAcids.length);
                newAaChain.customColor = new Color(jsonChain.color);

                let currAaId = jsonChain.nTerm as number;
                let currAa: any;

                while (currAa = jsonChain.aminoAcids.find((a: any) => a.id === currAaId)) {
                    newAaChain.insertNewCtermAminoAcid(currAa.id,
                        threeLetterCodeToAminoAcidType(currAa.aaAbbrev),
                        new Vector3().fromArray(
                            lenUnitsConv.convertArray(currAa.altPositions[0]))
                    );

                    currAaId = currAa.next;
                }

                if (newAaChain.length === 0) {
                    newAaChain.dispose();
                } else {
                    newCgStruc.addAaChain(newAaChain);
                }
            });

            // Structures originating from oxDNA are converted to
            // Catana geometry to have consistent internal parametrization
            if (isStructureInOxDnaGeometry(newCgStruc)) {
                transformStructureFromOxDnaGeometry(newCgStruc);
            }

            const sdIdx = this.sceneData.storedObjects.push(newCgStruc) - 1;
            const visProp = this.getVisProperties(parsedJson, jsonStructure.id);
            if (visProp != undefined) {
                this.sceneData.setVisualizationProperties(sdIdx, visProp);
            }
        });


        // Process external files / included all-atom molecules
        const idToFilePath = new Map<number, string>();

        // TODO No check for hash equality is performed now!
        parsedJson.externalFiles.forEach((exFile: any) => {
            idToFilePath.set(exFile.id, exFile.path);

            if (!exFile.isIncluded) {
                Log.error("Missing one external file: " + exFile.path);
            }
        });

        parsedJson.molecules?.others?.forEach((mol: any) => {
            const desiredPath = idToFilePath.get(mol.externalFileId);
            if (desiredPath) {
                const currAtomStructure = this.lastProcessedAllAtomStructures.find(s => s.path === desiredPath);

                if (currAtomStructure) {
                    currAtomStructure.name = mol.name;
                    const pos = new Vector3().fromArray(lenUnitsConv.convertArray(mol.positions[0]));
                    const rot = new Quaternion()
                        .setFromEuler(
                            new Euler()
                                .fromArray(angUnitsConv.convertArray(mol.orientations[0])));

                    const appendedIdx = this.sceneData.storedObjects.push(currAtomStructure) - 1;
                    this.sceneData.setComponentTransformation(appendedIdx, pos, rot);
                    const visProp = this.getVisProperties(parsedJson, mol.id);
                    if (visProp != undefined) {
                        this.sceneData.setVisualizationProperties(appendedIdx, visProp);
                    }
                } else {
                    Log.error("Structure with the given path not found: ", desiredPath);
                }
            } else {
                Log.error("External file for this molecule not found: ", mol);
            }
        });
    }

    private processIncludedFiles(): Promise<any> {
        const fileContent: string = this.streamer.asText();
        let pdbFilesContents: [string, string][] = [];
        const jsonPart: string = this.extractJsonPartFromUNF(fileContent, pdbFilesContents);
        return Promise.all([Promise.resolve(jsonPart), ...this.processPDBs(pdbFilesContents)]);
    }

    private parseProcessedFiles(processedData: any[]): any {
        this.lastProcessedJsonPart = processedData[0];
        this.lastProcessedAllAtomStructures = processedData.slice(1);

        this._beforeParse();
        this._parse();
        this._afterParse();
        return this.sceneData;
    }

    private extractJsonPartFromUNF(unfFileContent: string, pdbFilesContents: [string, string][]): string {
        const splittedFileParts: string[] = unfFileContent.split(/#INCLUDED_FILE\s+/);

        if (splittedFileParts.length > 0) {
            const jsonPart = splittedFileParts[0];

            for (let i = 1; i < splittedFileParts.length; ++i) {
                const firstLineBreakIdx = splittedFileParts[i].indexOf("\n");
                const fileName = splittedFileParts[i].substring(0, firstLineBreakIdx).trim();
                const fileContent = splittedFileParts[i].substring(firstLineBreakIdx + 1);
                pdbFilesContents.push([fileName, fileContent]);
            }

            return jsonPart;
        }
        else {
            Log.error("Cannot process UNF file content:", unfFileContent);
            return "{}";
        }
    }

    private processPDBs(pdbFilesContents: [string, string][]): Promise<any>[] {
        let promises: Promise<any>[] = [];

        pdbFilesContents.forEach(pdbFileData => {
            const streamer = new StringStreamer(pdbFileData[1]);
            const pdbParser = new PdbParser(streamer, {
                path: pdbFileData[0]
            });
            promises.push(pdbParser.parse());
        });

        return promises;
    }

    private insertLatticeBasedNucleotide(parentStrand: CgNucleicAcidStrand, globalId: number, nbType: NucleobaseType,
        lattice: Lattice, vhelix: any, cell: any, angUnitsConv: UnitsConverter): CgNucleotideProxy {
        const row: number = vhelix.latticePosition[0];
        const col: number = vhelix.latticePosition[1];
        const depth: number = cell.number;
        let desiredNormal: Vector3 = lattice.getNormal();
        const isFiveToThree = cell.fiveToThreeNts.indexOf(globalId) >= 0;
        let initAngleOffset = 0;

        if (!isFiveToThree) {
            desiredNormal.negate();

            const naType = parentStrand.naType;
            const naMap = NucleicAcidStructuresProvider.nucleicAcidStructures.get(naType)!;

            const currRefStructure = naMap.get(nbType)!;
            const complRefStructure = naMap.get(getComplementaryBase(nbType, naType))!;

            initAngleOffset = Math.PI - currRefStructure.originToC1.angleTo(complRefStructure.originToC1);
        }

        // TODO Does not really support different DNA geometries and their parameters ... probably related to the positional data being created "ad hoc"
        // in this case while being generated step-by-step (reusing position of neighbours) during regular building of helices

        // TODO Insertions/deletions are ignored...

        const initialTwistRad = angUnitsConv.convert(vhelix.initialAngle, undefined, AngularUnits.RAD) +
            Math.PI + initAngleOffset;

        const currentTwistVct = lattice.getColumnAxis().applyAxisAngle(lattice.getNormal(),
            initialTwistRad + MathUtils.degToRad(
                depth * CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseTwist));

        const axisTilt = (MathUtils.degToRad(CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseRoll) * 0.5) / Math.sin(MathUtils.degToRad(CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseTwist * 0.5));
        const helAxisRise = CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseRise * Math.cos(axisTilt) + CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseSlide * Math.sin(axisTilt);

        const cellOrigin = lattice.getPosition(row, col).add(
            lattice.getNormal().multiplyScalar(depth * helAxisRise)).
            add(currentTwistVct.clone().multiplyScalar(CatanaState.dnaFactory.dnaForm.defaultBaseParams.baseSlide));

        desiredNormal.applyAxisAngle(currentTwistVct, MathUtils.degToRad(CatanaState.dnaFactory.dnaForm.defaultComplBaseParams.propeller * 0.5)).normalize();

        const newNucleotide = CatanaState.dnaFactory.buildNucleotideFromParameters(cellOrigin, desiredNormal, currentTwistVct,
            nbType, parentStrand, NucleicAcidStrandEnd.THREE_PRIME, globalId);

        return newNucleotide;
    }

    private getVisProperties(unfJson: any, id: number): VisualizationProperties | undefined {
        const visProps = unfJson.misc?.catanaData?.visProps;
        if (visProps !== undefined) {
            for (let i = 0; i < visProps.length; ++i) {
                if (visProps[i].id === id) {
                    return visProps[i].data as VisualizationProperties;
                }
            }
        }

        return undefined;
    }
}

ParserRegistry.add("unf", UnfParser);

export default UnfParser;
