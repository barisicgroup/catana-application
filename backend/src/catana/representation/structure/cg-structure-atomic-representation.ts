import { CoarseGrainedRepresentationRegistry } from "../../../globals";
import BallAndStickRepresentation, { BallAndStickRepresentationParameters } from "../../../representation/ballandstick-representation";
import { CgStructureRepresentation } from "./cg-structure-representation";
import AtomProxy from "../../../proxy/atom-proxy";
import Representation, { RepresentationParameters } from "../../../representation/representation";
import Buffer from "../../../buffer/buffer";
import CgStructure from "../../data_model/cg-structure";
import Viewer from "../../../viewer/viewer";

/**
 * Atomistic representation uses ball+stick rendering to visualize atomistic structures
 * related to parent coarse-grained structure.
 * @remark Generation of this representation may fail if the atoms cannot be generated (for example, when the structure is too big)
 */
export class CgStructureAtomicRepresentation extends CgStructureRepresentation {
    private _atomicRepresentation: BallAndStickRepresentation | null = null;

    public constructor(cgStructure: CgStructure, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(cgStructure, viewer, Object.assign({
            colorScheme: params.colorScheme ?? "element"
        }, params));
    }

    public init(params: Partial<RepresentationParameters>) {
        this._filter.signals.stringChanged.add(() => {
            this.build();
        });
        super.init(params);
    }

    public setFilter(filterStr: string, silent?: boolean) {
        this.atomicRepresentation?.setFilter(filterStr, silent);
        super.setFilter(filterStr, silent);
    }

    private get atomicRepresentation(): BallAndStickRepresentation | null {
        return this._atomicRepresentation;
    }

    private set atomicRepresentation(ar: BallAndStickRepresentation | null) {
        this._atomicRepresentation = ar;
    }

    protected createBuffers(filterStr?: string): Buffer[] {
        if (this.atomicRepresentation) {
            if (this.cgStructure.atomicStructure === this.atomicRepresentation.structure) {
                return this.atomicRepresentation.createData(this.atomicRepresentation.structureView).bufferList;
            } else {
                this.atomicRepresentation?.dispose();
                this.atomicRepresentation = null;
            }
        }

        this.cgStructure.buildAtomicStructure().then((s) => {
            const repr = new BallAndStickRepresentation(s, this.viewer, this.getParameters());
            this.atomicRepresentation?.dispose();
            this.atomicRepresentation = repr;
            this.update();
        }, () => {
            let thisReprElem = undefined;
            this.cgStructure.parentComponent?.eachRepresentation(reprElem => {
                if (reprElem.repr === this) {
                    thisReprElem = reprElem;
                }
            });

            if (thisReprElem) {
                this.cgStructure.parentComponent?.removeRepresentation(thisReprElem);
            }
        });

        return [];
    }

    public getAtomRadius(atom: AtomProxy) {
        return this.atomicRepresentation?.getAtomRadius(atom) ?? 0;
    }

    public setVisibility(value: boolean, noRenderRequest?: boolean): Representation {
        if (this.atomicRepresentation) {
            this.atomicRepresentation.setVisibility(value, noRenderRequest);
        }
        return super.setVisibility(value, noRenderRequest);
    }

    public dispose() {
        super.dispose();
        this.atomicRepresentation?.dispose();
        this.atomicRepresentation = null;
    }

    public update(what?: any) {
        // TODO tailor the 'what' parameter
        super.update(what);
        if (this.atomicRepresentation) {
            this.atomicRepresentation.update(what);
        }
    }

    public setParameters(params: Partial<BallAndStickRepresentationParameters>, what: { [p: string]: any } = {}, rebuild: boolean = false): this {
        this.atomicRepresentation?.setParameters(params);
        return super.setParameters(params, what, rebuild);
    }

    protected getType(): string {
        return "atomic";
    }
}

CoarseGrainedRepresentationRegistry.add("atomic", CgStructureAtomicRepresentation);

export default CgStructureAtomicRepresentation;