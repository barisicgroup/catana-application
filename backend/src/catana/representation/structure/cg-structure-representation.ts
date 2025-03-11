import Representation, { RepresentationParameters } from "../../../representation/representation";
import Viewer from "../../../viewer/viewer";
import CgStructure from "../../data_model/cg-structure";
import {ColormakerParameters} from "../../../color/colormaker";
import Filter from "../../../filtering/filter";
import Buffer from "../../../buffer/buffer";

export interface CgStructureUpdateFields {
    model?: boolean,
    color?: boolean
    // TODO Add also position (e.g., RB dynamics can strongly benefit from that)
}

/**
 * Base class for visual representations of coarse-grained structures
 */
export abstract class CgStructureRepresentation extends Representation {
    protected _cgStructure: CgStructure;
    protected _filter: Filter;

    constructor(cgStructure: CgStructure, viewer: Viewer, params: Partial<RepresentationParameters>) {
        super(cgStructure, viewer, params);

        this._cgStructure = cgStructure;
        this._filter = new Filter();

        this.parameters = Object.assign({}, this.parameters);
        this.init(params);

        if(params.filt) {
            this._filter.setString(params.filt);
        }
    }

    public get cgStructure(): CgStructure {
        return this._cgStructure;
    }

    public init(params: Partial<RepresentationParameters>): void {
        super.init(params);
        this.type = this.getType();
        this.build();
    }

    public getColorParams(p?: { [p: string]: any }): { scheme: string; [p: string]: any } & ColormakerParameters {
        return {
            ...super.getColorParams(),
            cgStructure: this._cgStructure
        }
    }

    public setFilter(filterStr: string, silent?: boolean) {
        this._filter.setString(filterStr, silent);
    }

    public getParameters(): Partial<RepresentationParameters> {
        return Object.assign(
            super.getParameters(),
            {
                filt: this.filterString
            });
    }

    public get filterString(): string {
        return this._filter.string;
    }

    public create(): void {
        this.bufferList = this.createBuffers();
    }

    protected abstract createBuffers(filterStr?: string): Buffer[];

    public update(what?: CgStructureUpdateFields): void {
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

    protected abstract getType(): string;

    public createBuffersWithFilter(filterString: string): Buffer[] {
        const oldFilterString = this.filterString;
        this.setFilter(filterString, true);
        const buffers = this.createBuffers();
        this.setFilter(oldFilterString, true);
        return buffers;
    }
}