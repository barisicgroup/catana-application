import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";
import { BDnaIdealisticForm, DnaForm } from "./dna-forms";
import { CgStructure, Log } from "../../catana";
import { getComplementaryBase, NucleobaseType } from "../data_model/types_declarations/monomer-types";
import { NucleicAcidSequenceProvider } from "./sequence-providers/nucleic-acid-sequence-provider";
import { RandomNaSequenceProvider } from "./sequence-providers/random-na-sequence-provider";
import { FastaSequenceProvider } from "./sequence-providers/fasta-sequence-provider";
import { NucleicAcidStrandEnd, NucleicAcidType } from "../data_model/types_declarations/polymer-types";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import NucleicAcidStructuresProvider from "./structure-providers/nucleic-acid-structures-provider";
import GlobalIdGenerator from "../utils/global-id-generator";
import NucleicAcidStrandCreator from "./nucleic-acid-strand-creator";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import { computeHelicalAxis } from "./nucleic-acid-utils";

/**
 * Class serving for the creation of coarse-grained DNA structures
 */
class DnaFactory {
    private _dnaForm: DnaForm;
    private _ntSequence: NucleicAcidSequenceProvider;

    public constructor() {
        this.dnaForm = BDnaIdealisticForm;
        this.sequenceProvider = new RandomNaSequenceProvider();
    }

    /**
     * @returns DNA form currently used for creation of DNA structures
     */
    public get dnaForm(): DnaForm {
        return this._dnaForm;
    }

    /**
     * Sets new DNA form to be used for creation of DNA structures
     */
    public set dnaForm(dnaForm: DnaForm) {
        this._dnaForm = dnaForm;
    }

    /**
     * @returns Sequence provider currently used for generation of sequence of new DNA structures
     */
    public get sequenceProvider(): NucleicAcidSequenceProvider {
        return this._ntSequence;
    }

    /**
     * Sets new sequence provider to generate sequences of newly created DNA structures
     */
    public set sequenceProvider(sp: NucleicAcidSequenceProvider) {
        this._ntSequence = sp;
    }

    /**
     * Builds a DNA helix of given length and directionality.
     * The calling function must decide if the returing strand is supposed to be
     * appended to an existing structure or serve as a basis for new separate structure/component.
     * 
     * @param numOfNucleotides length of the created strand
     * @param helicalAxisStart positon where the strand should start
     * @param helicalAxisDirection direction of the strand's helical axis
     * @param initialHydrFaceDir hydrogen face direction of the first nucleotide of the strand
     * @param overrideSequenceProvider sequence provider to use instead of the default DNAFactory's one
     * @returns new DNA single strand
     */
    public buildHelix(
        numOfNucleotides: number,
        helicalAxisStart: Vector3,
        helicalAxisDirection: Vector3,
        initialHydrFaceDir?: Vector3,
        overrideSequenceProvider?: NucleicAcidSequenceProvider): CgNucleicAcidStrand | null {
        if (numOfNucleotides <= 0) {
            return null;
        }

        const seqProv: NucleicAcidSequenceProvider = overrideSequenceProvider ?? this.sequenceProvider;
        const newHelix: CgNucleicAcidStrand = new CgNucleicAcidStrand(GlobalIdGenerator.generateId(), "A", NucleicAcidType.DNA);

        let strandOriginBaseY = new Vector3(0, 1, 0);
        let strandOriginBaseZ = new Vector3(0, 0, 1);

        // Align initial base frame z-axis with helical axis direction
        const basisRotation: Quaternion = new Quaternion().setFromUnitVectors(strandOriginBaseZ, helicalAxisDirection);

        strandOriginBaseY.applyQuaternion(basisRotation).normalize();
        strandOriginBaseZ.applyQuaternion(basisRotation).normalize();

        const baseHydrFaceDir: Vector3 =
            (initialHydrFaceDir?.clone()?.projectOnPlane(strandOriginBaseZ) ?? strandOriginBaseY.clone()).normalize();

        // Insert first nucleotide as a template
        const nbType = seqProv.getNext();
        const refNbData = NucleicAcidStructuresProvider.nucleicAcidStructures.get(newHelix.naType)!.get(nbType);

        if (NucleicAcidStructuresProvider.nucleicAcidStructures.size === 0) {
            Log.error("Reference structure data not yet initialized.");
            return null;
        }

        if (refNbData === undefined) {
            Log.error("No existing reference data for:", nbType);
            return null;
        }

        const currBaseNormal = strandOriginBaseZ.clone().normalize();
        const currHydrFaceDir = baseHydrFaceDir;
        const currOrigin = helicalAxisStart;

        const currOriginToBase = refNbData.originToBaseCenter.clone().applyQuaternion(basisRotation);
        const currOriginToBackbone = refNbData.originToBackboneCenter.clone().applyQuaternion(basisRotation);

        const baseCenter = currOrigin.clone().add(currOriginToBase);
        const backboneCenter = currOrigin.clone().add(currOriginToBackbone);

        const templateNucl = newHelix.insertNewThreePrimeNucleotide(GlobalIdGenerator.generateId(), nbType,
            baseCenter, backboneCenter, currBaseNormal, currHydrFaceDir);

        // Generate the remaining nucleotides based on this template
        return this.generateNucleotidesFromTemplate(numOfNucleotides - 1, templateNucl,
            newHelix, NucleicAcidStrandEnd.THREE_PRIME, seqProv, this.dnaForm);
    }

    /**
     * Builds DNA single strand based on the data of provided nucleic acid strand creator.
     * 
     * @param strandCreator strand creator carrying the data of the strand to be created
     * @returns new DNA single strand
     */
    public buildHelixFromCreator(strandCreator: NucleicAcidStrandCreator): CgNucleicAcidStrand | null {
        return this.buildHelix(strandCreator.numOfNucleotides,
            strandCreator.helicalAxisStart,
            strandCreator.helicalAxisDirection);
    }

    /**
     * Builds new DNA single strand with the given sequence.
     * 
     * @param fastaSequence FASTA sequence storing the sequence of the new strand
     * @returns new DNA single strand
     */
    public buildHelixFromSequence(fastaSequence: string): CgNucleicAcidStrand | null {
        return this.buildHelix(fastaSequence.length, new Vector3(0, 0, 0), new Vector3(1, 0, 0), undefined, new FastaSequenceProvider(fastaSequence));
    }

    /**
     * Builds complementary strand for the given single strand.
     * 
     * @param sourceHelix source single strand
     * @returns new DNA single strand complementary to the provided one (both in sequence and position).
     * The "pair" information is assigned by the function but it is up to the caller to add this new single strand
     * to the corresponding structure.
     */
    public buildComplementaryHelix(sourceHelix: CgNucleicAcidStrand): CgNucleicAcidStrand {
        const newHelix = new CgNucleicAcidStrand(
            GlobalIdGenerator.generateId(),
            sourceHelix.parentStructure?.generateChainName() ?? "A",
            sourceHelix.naType,
            sourceHelix.parentStructure,
            sourceHelix.length);

        sourceHelix.forEachNucleotideReverse(nt => {
            if (!nt.pairedNucleotide) {
                this.buildComplementaryNucleotide(nt, sourceHelix, newHelix, newHelix.length);
            }
        });

        return newHelix;
    }

    /**
     * Creates double strand going from point A to point B.
     * 
     * @param start start position of the double strand
     * @param end end position of the double strand
     * @param parentStructure structure to which the double strand should be appended
     * @returns tuple referencing two newly created strands
     */
    public buildDsDnaBetweenPoints(start: Vector3, end: Vector3, parentStructure?: CgStructure): [CgNucleicAcidStrand | undefined, CgNucleicAcidStrand | undefined] {
        const initialHelix = this.buildHelixFromCreator(new NucleicAcidStrandCreator(
            new Vector3(start.x, start.y, start.z),
            new Vector3(end.x, end.y, end.z)
        )) ?? undefined;

        let complHelix;

        if (initialHelix) {
            if (parentStructure) {
                initialHelix.name = parentStructure.generateChainName();
                parentStructure.addNaStrand(initialHelix);
            }

            complHelix = this.buildComplementaryHelix(initialHelix);

            if (parentStructure) {
                parentStructure.addNaStrand(complHelix);
            }
        }

        return [initialHelix, complHelix];
    }

    /**
     * Builds complementary nucleotide to the given nucleotide (both in nucleobase type and location).
     * 
     * @param nt nucleotide for which to create a complement
     * @param sourceNtStrand parent strand of the source nucleotide
     * @param newNtStrand strand of the newly created nucleotide
     * @param newNtStrandIdx location in the newly created nucleotide's strand where it is supposed to be inserted
     * @returns nucleotide proxy referencing newly created complementary nucleotide
     */
    public buildComplementaryNucleotide(nt: CgNucleotideProxy, sourceNtStrand: CgNucleicAcidStrand,
        newNtStrand: CgNucleicAcidStrand, newNtStrandIdx: number): CgNucleotideProxy {
        const newNbType = getComplementaryBase(nt.nucleobaseType, sourceNtStrand.naType);

        const newRefStructure = NucleicAcidStructuresProvider.nucleicAcidStructures
            .get(sourceNtStrand.naType)?.get(newNbType)!;

        const currRefStructure = NucleicAcidStructuresProvider.nucleicAcidStructures
            .get(sourceNtStrand.naType)?.get(nt.nucleobaseType)!;

        const baseNormal = nt.baseNormal.clone().applyAxisAngle(nt.hydrogenFaceDir, MathUtils.degToRad(-this._dnaForm.defaultComplBaseParams.propeller)).normalize().negate();
        const hydrogenFaceDir = nt.hydrogenFaceDir.clone().negate();

        const currBasis = new Matrix4().makeBasis(nt.baseShortAxis, nt.hydrogenFaceDir, nt.baseNormal);
        const currOrigin = nt.nucleobaseCenter.sub(currRefStructure.originToBaseCenter.clone().applyMatrix4(currBasis));
        const currToNewRotation = new Matrix4().makeRotationAxis(nt.baseShortAxis, Math.PI);

        const newOrToBb = newRefStructure.originToBackboneCenter.clone().applyMatrix4(currBasis).applyMatrix4(currToNewRotation);
        const newOrToNb = newRefStructure.originToBaseCenter.clone().applyMatrix4(currBasis).applyMatrix4(currToNewRotation);

        const newNt = newNtStrand.insertNucleotide(newNtStrandIdx, GlobalIdGenerator.generateId(), newNbType,
            currOrigin.clone().add(newOrToNb), currOrigin.clone().add(newOrToBb),
            baseNormal, hydrogenFaceDir);

        newNt.pairedNucleotide = nt;
        nt.pairedNucleotide = newNt;

        return newNt;
    }

    /**
     * Extends provided single strand in the designated direction.
     * 
     * @param strand strand to extend
     * @param endToExtend which end of the strand to extend
     * @param numOfNucleotides length of the extension
     * @param direction direction of the extension (if not set, helical axis direction will be used)
     * @param overrideSequenceProvider custom sequence provider for the extended part
     * @returns reference to the provided strand with the corresponding part extended
     */
    public extendHelix(strand: CgNucleicAcidStrand, endToExtend: NucleicAcidStrandEnd,
        numOfNucleotides: number, direction?: Vector3,
        overrideSequenceProvider?: NucleicAcidSequenceProvider): CgNucleicAcidStrand {
        if (strand.length === 0 || numOfNucleotides === 0) {
            return strand;
        }

        return this.generateNucleotidesFromTemplate(numOfNucleotides,
            (endToExtend === NucleicAcidStrandEnd.FIVE_PRIME ? strand.fivePrime : strand.threePrime)!,
            strand, endToExtend, overrideSequenceProvider ?? this.sequenceProvider, this.dnaForm, direction);
    }

    /**
     * Extends given double helix if any exists. If not, the provided single strand will be extended. 
     * 
     * @param primaryStrand strand to be extended (one of the double helice's strands)
     * @param primaryStrandEndToExtend where to perform the extension w.r.t provided primary strand
     * @param numOfNucleotides length of the extension
     * @param direction direction of the extension (if not provided, helical axis direction is used)
     * @param overrideSequenceProvider custom sequence provider for the extended part
     * @returns array of up to two single single strand. First element is the extended primary strand, second is reference
     * to extended complementary strand (if any exists).
     */
    public extendDoubleHelix(primaryStrand: CgNucleicAcidStrand, primaryStrandEndToExtend: NucleicAcidStrandEnd,
        numOfNucleotides: number, direction?: Vector3,
        overrideSequenceProvider?: NucleicAcidSequenceProvider): [CgNucleicAcidStrand, CgNucleicAcidStrand | undefined] {

        let strandEndNucl = primaryStrand.threePrime!;
        let otherStrandEnd = NucleicAcidStrandEnd.FIVE_PRIME;

        if (primaryStrandEndToExtend === NucleicAcidStrandEnd.FIVE_PRIME) {
            strandEndNucl = primaryStrand.fivePrime!;
            otherStrandEnd = NucleicAcidStrandEnd.THREE_PRIME;
        }

        const complNucleotide = strandEndNucl.pairedNucleotide;

        if (!complNucleotide) {
            return [
                this.extendHelix(primaryStrand, primaryStrandEndToExtend,
                    numOfNucleotides, direction,
                    overrideSequenceProvider),
                undefined
            ]
        }

        const otherStrand = complNucleotide.parentStrand;

        const seqProv = overrideSequenceProvider ?? this.sequenceProvider;
        let primaryStrTypes = [];

        for (let i = 0; i < numOfNucleotides; ++i) {
            primaryStrTypes.push(seqProv.getNext());
        }

        const primSeqProv = new FastaSequenceProvider(primaryStrTypes);
        const complSeqProv = new FastaSequenceProvider(primaryStrTypes.map(x => getComplementaryBase(x, primaryStrand.naType)));

        const primStr = this.extendHelix(primaryStrand, primaryStrandEndToExtend,
            numOfNucleotides, direction, primSeqProv);
        const secStr = this.extendHelix(otherStrand, otherStrandEnd,
            numOfNucleotides, direction?.clone().negate(), complSeqProv);

        // Add complementary information

        let primFrom = 0;
        let secFrom = secStr.length - 1;
        const primTp = primaryStrandEndToExtend === NucleicAcidStrandEnd.THREE_PRIME;

        if (primTp) {
            primFrom = primStr.length - 1;
            secFrom = 0;
        }

        for (let i = 0; i < numOfNucleotides; ++i) {
            const primNt = primStr.getNucleotideProxy(primFrom + (primTp ? -i : i))!;
            const secNt = secStr.getNucleotideProxy(secFrom + (!primTp ? -i : i))!;

            primNt.pairedNucleotide = secNt;
            secNt.pairedNucleotide = primNt;
        }

        return [primStr, secStr];
    }

    /**
     * Creates new nucleotide having the given parameters.
     * 
     * @param helicalAxisOrigin origin of the helical axis (location of the nucleotide)
     * @param baseNormal normal of the nucleobase's plane
     * @param originToC1 direction of the origin - C1' atom vector (similar to hydrogen face direction)
     * @param nbType nucleobase type
     * @param parentStrand parent strand of the new nucleotide
     * @param endToExtend to which end to insert the new nucleotide
     * @param globalId global ID of the new nucleotide
     * @returns proxy referencing the newly created nucleotide
     */
    public buildNucleotideFromParameters(helicalAxisOrigin: Vector3, baseNormal: Vector3, originToC1: Vector3,
        nbType: NucleobaseType, parentStrand: CgNucleicAcidStrand, endToExtend: NucleicAcidStrandEnd, globalId?: number): CgNucleotideProxy {
        const insertToStrand = (endToExtend === NucleicAcidStrandEnd.THREE_PRIME ?
            parentStrand.insertNewThreePrimeNucleotide :
            parentStrand.insertNewFivePrimeNucleotide).bind(parentStrand);

        const refStrucData = NucleicAcidStructuresProvider.nucleicAcidStructures
            .get(parentStrand.naType)!
            .get(nbType)!;

        let strandOriginBaseY = new Vector3(0, 1, 0);
        let strandOriginBaseZ = new Vector3(0, 0, 1);
        let refOriginToC1 = refStrucData.originToC1.clone();
        let refOriginToNb = refStrucData.originToBaseCenter.clone();
        let refOriginToBb = refStrucData.originToBackboneCenter.clone();

        // Align reference vectors with the normal
        const basisRotation: Quaternion = new Quaternion().setFromUnitVectors(strandOriginBaseZ, baseNormal);

        strandOriginBaseY.applyQuaternion(basisRotation).normalize();
        strandOriginBaseZ.applyQuaternion(basisRotation).normalize();
        refOriginToC1.applyQuaternion(basisRotation).normalize();
        refOriginToNb.applyQuaternion(basisRotation);
        refOriginToBb.applyQuaternion(basisRotation);

        const originToC1Proj = originToC1.clone().projectOnPlane(strandOriginBaseZ).normalize();

        // Align the reference origin-C1' vector with the desired one
        const refOriginToProjOrigin: Quaternion = new Quaternion().setFromUnitVectors(refOriginToC1, originToC1Proj);

        strandOriginBaseY.applyQuaternion(refOriginToProjOrigin).normalize();
        strandOriginBaseZ.applyQuaternion(refOriginToProjOrigin).normalize();
        refOriginToNb.applyQuaternion(refOriginToProjOrigin);
        refOriginToBb.applyQuaternion(refOriginToProjOrigin);

        const baseCenter = helicalAxisOrigin.clone().add(refOriginToNb);
        const backboneCenter = helicalAxisOrigin.clone().add(refOriginToBb);

        return insertToStrand(globalId ?? GlobalIdGenerator.generateId(), nbType, baseCenter,
            backboneCenter, strandOriginBaseZ, strandOriginBaseY);
    }

    /**
     * Generates given number of nucleotides starting at a template nucleotide.
     * 
     * @param count number of nucleotides to generate
     * @param templateNucleotide template nucleotide aka the basis of the newly created strand
     * @param parentStrand parent strand of the nucleotides
     * @param endToExtend end of strand to  be extended
     * @param sequenceProvider sequence provider to be used for generation of base types
     * @param dnaForm custom DNA form
     * @param overrideHelicalAxis custom direction of the helical axis
     * @returns reference to DNA strand with the newly created nucleotides appended
     */
    private generateNucleotidesFromTemplate(count: number, templateNucleotide: CgNucleotideProxy, parentStrand: CgNucleicAcidStrand,
        endToExtend: NucleicAcidStrandEnd, sequenceProvider: NucleicAcidSequenceProvider, dnaForm?: DnaForm, overrideHelicalAxis?: Vector3): CgNucleicAcidStrand {
        if (count <= 0) {
            return parentStrand;
        }

        const nsm = NucleicAcidStructuresProvider.nucleicAcidStructures.get(parentStrand.naType)!;
        const currDnaForm = dnaForm ?? this.dnaForm;

        const dir = endToExtend === NucleicAcidStrandEnd.THREE_PRIME ? 1 : -1;
        const insertToStrand = (endToExtend === NucleicAcidStrandEnd.THREE_PRIME ?
            parentStrand.insertNewThreePrimeNucleotide :
            parentStrand.insertNewFivePrimeNucleotide).bind(parentStrand);

        const srcNuclRefStruc = nsm.get(templateNucleotide.nucleobaseType)!;
        const srcBasis = new Matrix4().makeBasis(
            templateNucleotide.baseShortAxis,
            templateNucleotide.hydrogenFaceDir,
            templateNucleotide.baseNormal);
        const srcOrigin = templateNucleotide.nucleobaseCenter.sub(
            srcNuclRefStruc.originToBaseCenter.clone().applyMatrix4(srcBasis)
        );
        const srcOriginToC1 = srcNuclRefStruc.originToC1.clone().applyMatrix4(srcBasis).normalize();
        const srcHydrFaceDir = templateNucleotide.hydrogenFaceDir;
        const helicalAxisDirection = overrideHelicalAxis ?? computeHelicalAxis(templateNucleotide);

        // Helical axis is always expected to point in 5' to 3' direction
        if (endToExtend === NucleicAcidStrandEnd.FIVE_PRIME &&
            helicalAxisDirection.dot(templateNucleotide.baseNormal) < 0) {
            helicalAxisDirection.negate();
        }

        let currOrigin = srcOrigin.clone();
        let desiredOriginToC1 = srcOriginToC1.clone();
        let lastHydrFaceDir = srcHydrFaceDir;
        let lastBaseNormal = helicalAxisDirection;

        const axisTilt = (MathUtils.degToRad(currDnaForm.defaultBaseParams.baseRoll) * 0.5) / Math.sin(MathUtils.degToRad(currDnaForm.defaultBaseParams.baseTwist * 0.5));
        const helAxisRise = currDnaForm.defaultBaseParams.baseRise * Math.cos(axisTilt) + currDnaForm.defaultBaseParams.baseSlide * Math.sin(axisTilt);

        for (let i = 0; i < count; ++i) {
            const nbType = sequenceProvider.getNext();
            const thisNuclRefStruc = nsm.get(nbType)!;

            // Base rise is performed by moving along the helical axis
            currOrigin.add(helicalAxisDirection.clone().multiplyScalar(helAxisRise * dir)).
                add(lastHydrFaceDir.clone().multiplyScalar(currDnaForm.defaultBaseParams.baseSlide * dir));

            const thisOriginToC1 = thisNuclRefStruc.originToC1.clone().applyMatrix4(srcBasis).normalize();

            // The helical twist is achieved by rotating the (nucleotide origin - C1' atom) vector 
            // around the helical axis
            desiredOriginToC1
                .applyAxisAngle(
                    helicalAxisDirection,
                    MathUtils.degToRad(currDnaForm.defaultBaseParams.baseTwist * dir))
                .normalize();

            const currC1toDesiredC1 = new Quaternion().setFromUnitVectors(thisOriginToC1, desiredOriginToC1);

            const currBaseHydrFaceDir = srcHydrFaceDir.clone()
                .applyQuaternion(currC1toDesiredC1).normalize();

            lastHydrFaceDir = currBaseHydrFaceDir;

            let currBaseNormal = lastBaseNormal.clone().applyAxisAngle(currBaseHydrFaceDir, MathUtils.degToRad(currDnaForm.defaultBaseParams.baseRoll)).normalize();
            lastBaseNormal = currBaseNormal.clone();

            // Propeller twist (intra-base param so intentionally not saved in the "last base normal")
            currBaseNormal.applyAxisAngle(currBaseHydrFaceDir, MathUtils.degToRad(currDnaForm.defaultComplBaseParams.propeller * 0.5)).normalize();

            const currOriginToBase = thisNuclRefStruc.originToBaseCenter.clone()
                .applyMatrix4(srcBasis)
                .applyQuaternion(currC1toDesiredC1);

            const currOriginToBackbone = thisNuclRefStruc.originToBackboneCenter.clone()
                .applyMatrix4(srcBasis)
                .applyQuaternion(currC1toDesiredC1);

            const baseCenter = currOrigin.clone().add(currOriginToBase.applyAxisAngle(currBaseHydrFaceDir, MathUtils.degToRad(currDnaForm.defaultBaseParams.baseRoll)));
            const backboneCenter = currOrigin.clone().add(currOriginToBackbone.applyAxisAngle(currBaseHydrFaceDir, MathUtils.degToRad(currDnaForm.defaultBaseParams.baseRoll)));

            insertToStrand(GlobalIdGenerator.generateId(), nbType, baseCenter,
                backboneCenter, currBaseNormal, currBaseHydrFaceDir);
        }

        return parentStrand;
    }
}

export default DnaFactory;