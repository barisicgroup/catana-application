import {Signal} from "signals";
import PickingProxy from "../controls/picking-proxy";
import Component from "../component/component";
import Representation from "../representation/representation";
import RepresentationElement from "../component/representation-element";
import StructureRepresentation from "../representation/structure-representation";
import {CgStructureRepresentation} from "./representation/structure/cg-structure-representation";
import Filter from "../filtering/filter";
import {Group} from "three";
import Viewer, {BufferInstance} from "../viewer/viewer";
import Buffer from "../buffer/buffer";

type SelectionSignals = {
    selectionChanged: Signal
}

/**
 * Describes a generic selection
 * An object that holds an array of data, can add into this array, query its size, and iterate through it
 */
class Selection<T> {
    protected objects: Array<T> = new Array<T>();
    public add(obj: T) {
        this.objects.push(obj);
    }
    public get size(): number {
        return this.objects.length;
    }
    public forEach(callback: (i: number, obj: T) => void): void {
        for (let i = 0; i < this.objects.length; ++i) {
            callback(i, this.objects[i]);
        }
    }
}

/**
 * Describes a selection of components
 * Additionally enables to iterate through each oid (objectId) of the components and query how many oids it contains in total
 *
 *      A component contains representations
 *      A representation contains buffers
 *      A buffer may have an oid assigned to it
 */
export class ComponentSelection extends Selection<Component>{
    public forEachOid(callback: (oid: number) => void) {
        this.forEach((i, component) => {
            component.eachRepresentation((reprElem) => {
                const r = reprElem.repr;
                for (let j = 0; j < r.bufferList.length; ++j) {
                    const buffer = r.bufferList[j];
                    if (!buffer.pickingUniforms) continue;
                    const oid = buffer.pickingUniforms.objectId.value;
                    callback(oid);
                }
            });
        });
    }
    public get oidCount(): number {
        let count = 0;
        this.forEach((i, component) => {
            component.eachRepresentation((reprElem => {
                count += reprElem.repr.bufferList.length;
            }));
        });
        return count;
    }
}

interface RepresentationSelectionObject {
    component: Component;
    representation: Representation;
}
/**
 * Describes a selection of representations (and, for each of them, their respective components)
 * Additionally enables to iterate through each oid (objectId) of the representations and query how many oids it contains in total
 *
 *      A component contains representations
 *      A representation contains buffers
 *      A buffer may have an oid assigned to it
 */
export class RepresentationSelection extends Selection<RepresentationSelectionObject>{
    public forEachOid(callback: (oid: number) => void) {
        this.forEach((i, o) => {
            const r: Representation = o.representation;
            for (let j = 0; j < r.bufferList.length; ++j) {
                const oid = r.bufferList[j].pickingUniforms.objectId.value;
                callback(oid);
            }
        });
    }
    public get oidCount(): number {
        let count = 0;
        this.forEach((i, o) => {
            count += o.representation.bufferList.length;
        });
        return count;
    }
}

export type PickingSelectionObject = {
    objectId: number,
    pickingId: number
}
/**
 * Describes a selection based on a picking texture, where each pixel is has a pickingId and an objectId
 */
export class PickingSelection extends Selection<PickingSelectionObject> {

}


export type FilteredSelectionObject = {
    c: Component,
    r: StructureRepresentation | CgStructureRepresentation,
    f: string
};
/**
 * Describes as selection based on filters
 */
export class FilteredSelection extends Selection<FilteredSelectionObject> {
    public createPickingGroup(): Group {
        const group = new Group();
        this.forEachBuffer((b, i) => {
            if (b.pickable) {
                //b.setMatrix(obj.c.matrix);
                //const mesh = Viewer.prepareBuffer(b).pickingMesh;
                Viewer.prepareBuffer(b, i);
                group.add(b.pickingGroup);
            }
        });
        return group;
    }
    private forEachBuffer(callback: (b: Buffer, i: BufferInstance) => void) {
        this.forEach((i, obj) => {
            if (!obj.r.visible) return;
            const filterString = "(" + obj.r.filterString + ") AND (" + obj.f + ")";
            if (obj.r instanceof StructureRepresentation) {
                const sview = obj.r.structure.getView(new Filter(filterString));
                const data = obj.r.createData(sview);
                if (data?.bufferList) {
                    for (const b of data.bufferList) {
                        const instance = data.instanceList; // TODO is this right?
                        callback(b, instance);
                    }
                }
            } else { // if (obj.r instanceof CgStructureRepresentation) {
                const buffers = obj.r.createBuffersWithFilter(filterString);
                for (const b of buffers) {
                    callback(b, {matrix: obj.c.matrix.clone()});
                }
            }
        })
    }
}

/**
 * Manages an active selection and makes it convenient to change them and turn them on or off
 */
export class CatanaSelection {
    private _selection: null | Selection<any> = null;

    public readonly signals: SelectionSignals;

    constructor() {
        this.signals = {
            selectionChanged: new Signal()
        }
    }

    public smartSelect(c?: Component, r?: Representation | RepresentationElement, p?: PickingProxy) {
        if (!p && !r && c) {
            this.selectComponent(c);
        } else if (!p && r && c) {
            this.selectRepresentation(r, c);
        } else if (p) {
            this.selectPickingProxy(p);
        } else {
            console.error("Unrecognized combination for smartSelect. c=" + c + ", r=" + r + ", p=" + p);
        }
    }

    public selectPickingProxy(pickingProxy: PickingProxy) {
        this._selection = new PickingSelection();
        this._selection.add({
            objectId: pickingProxy.oid,
            pickingId: pickingProxy.pid
        });
        this.signals.selectionChanged.dispatch();
    }

    public selectComponent(component: Component) {
        this._selection = new ComponentSelection();
        this._selection.add(component);
        this.signals.selectionChanged.dispatch();
    }

    public selectRepresentation(representation: Representation | RepresentationElement, parentComponent: Component) {
        this._selection = new RepresentationSelection();
        representation = CatanaSelection.getRepresentation(representation);
        this._selection.add({
            component: parentComponent,
            representation: representation
        });
        this.signals.selectionChanged.dispatch();
    }

    public selectFiltered(...objs: {c: Component, r: Representation | RepresentationElement, f: string}[]) {
        const selection: FilteredSelection = new FilteredSelection();
        for (const o of objs) {
            const r = CatanaSelection.getRepresentation(o.r);
            if (r instanceof StructureRepresentation || r instanceof CgStructureRepresentation) {
                selection.add({
                    c: o.c,
                    r: r,
                    f: o.f
                });
            } else {
                console.error("Unable to fully select with filters. A StructureRepresentation is needed for " +
                    "that. Instead, the following was passed: " + r);
                continue;
            }
        }
        if (selection.size === 0) {
            console.warn("Nothing was selected with 'selectFiltered'");
            this.unselect();
        } else {
            this._selection = selection;
            this.signals.selectionChanged.dispatch();
        }
    }

    public unselect(silent: boolean = false) {
        const changed = this._selection !== null;
        this._selection = null;
        if (!silent && changed) this.signals.selectionChanged.dispatch();
    }

    public get selection(): null | Selection<any> {
        return this._selection;
    }

    public hasSelection() {
        return this._selection !== null;
    }

    private static getRepresentation(r: Representation | RepresentationElement): Representation {
        return r instanceof RepresentationElement ? r.repr : r;
    }
}

export default CatanaSelection;