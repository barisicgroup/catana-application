import Element, {CallbackType} from "../element";
import TextElement from "../text-element";
import {IconButton, IconType} from "../icon";

type OnRowDeletedCallback = (key: string) => void;
type OnRowMovedCallback = OnRowDeletedCallback;

export enum TableType {
    FORM, LIST, COMPACT
}

class TableCell extends Element<HTMLDivElement> {
    public constructor(readonly element: Element) {
        super(document.createElement("div"));
        this.dom.className = "TableCell";
        this.dom.appendChild(element.dom);
    }
}

/**
 * @param numColumns The number of columns of this table
 * @param deletable Whether the rows of this table are deletable
 * @param reorganizable Whether the rows of this table are reorganizable (movable up/down)
 * @param stretches An array of numbers with the fractions of how much each column will stretch
 * @param header An array of strings with the name of the columns (will be displayed as a header)
 */
class Table<ROW extends Element[] = Element[]> extends Element<HTMLDivElement> {

    private readonly numColumns: number;
    private readonly deletable: boolean;
    private readonly reorganizable: boolean;

    private readonly rowMap: Map<ROW, TableCell[]>;
    private readonly cells: TableCell[][];

    private readonly rowMovedCallbacks: OnRowMovedCallback[] = [];
    private readonly rowDeletedCallbacks: OnRowDeletedCallback[] = [];

    public constructor(numColumns: number, type: TableType = TableType.FORM, deletable: boolean = false, reorganizable: boolean = false, stretches?: number[], header?: string[], maxWidth?: string | string[]) {
        super(document.createElement("div"));
        this.dom.className = "Table";

        switch (type) {
            case TableType.FORM: this.addClass("FormTable"); break;
            case TableType.COMPACT: this.addClass("CompactTable"); break;
            case TableType.LIST: this.addClass("ListTable"); break;
            default: console.error("Unexpected Table type: " + TableType[type]); break;
        }

        const defaultMaxWidth = typeof maxWidth === "string" ? maxWidth : "100%";
        if (!maxWidth || typeof maxWidth === "string") {
            maxWidth = [];
            maxWidth.length = numColumns;
            maxWidth.fill(defaultMaxWidth);

        } else if (maxWidth.length !== numColumns) {
            console.warn("Number of provided 'maxWidth' value does not correspond to number of columns." +
                " Extra 'maxWidth' will be ignored, or missing ones will be set to '100%'.");
            if (maxWidth.length > numColumns) maxWidth.length = numColumns;
            while (maxWidth.length < numColumns) maxWidth.push("100%");
        }

        if (!stretches) {
            stretches = [];
            stretches.length = numColumns;
            stretches.fill(1);
            stretches[0] = 0;

        } else if (stretches.length !== numColumns) {
            console.warn("Number of provided 'stretches' value does not correspond to number of columns." +
                " Extra 'stretches' will be ignored, or missing ones will be set to zero.");
            if (stretches.length > numColumns) stretches.length = numColumns;
            while (stretches.length < numColumns) stretches.push(0);
        }

        if (header && header.length !== numColumns) {
            console.warn("Number of elements of provided 'header' array does not correspond to number" +
                " of columns. Extra values will be ignored, or missing ones will be set to \"\".");
            if (header.length > numColumns) header.length = numColumns;
            while (stretches.length < numColumns) header.push("");
        }

        for (let i = 0; i < (Number(deletable) + (2 * Number(reorganizable))); ++i) {
            maxWidth.push("100%");
            stretches.push(0);
            if (header) header.push("");
        }
        if (header) for (let hStr of header) {
            const h = new TextElement(hStr);
            h.dom.className = "TableHeader";
            this.dom.appendChild(h.dom);
        }

        // Handle stretches
        {
            // Ensure that every stretch value is at least 1 (except 0)
            const min = Math.min(...stretches.filter(v => v !== 0)); // Filter out zeros
            if (min < 0) stretches = stretches.map(v => Math.abs(v)); // Make every stretch value positive
            if (Math.abs(min) < 0) stretches = stretches.map(v => Math.max(1, v + (1 - min))); // Shift so that every value is >= 1
            // Note that zeros are ignored here! They will be converted into 'fit-content(100%)' down below
            //this.dom.style.gridTemplateColumns = stretches.join("fr ") + "fr";
            this.dom.style.gridTemplateColumns = stretches
                .map((v, i) => v === 0 ? "fit-content(" + maxWidth![i] + ")" : v + "fr")
                .join(" ");
        }

        this.numColumns = numColumns;
        this.deletable = deletable;
        this.reorganizable = reorganizable;

        this.rowMap = new Map<ROW, TableCell[]>();
        this.cells = [];
    }

    private up(key: string, row: ROW) {
        const cells = this.rowMap.get(row);
        if (!cells) return;
        const rowIndex = this.cells.indexOf(cells);
        if (rowIndex > 0) {
            const prevElem = this.cells[rowIndex - 1][0];
            this.cells.splice(rowIndex, 1);
            this.cells.splice(rowIndex - 1, 0, cells);
            for (const cell of cells) {
                cell.orphan();
                prevElem.appendBefore(cell);
            }
            this.emitMove(key);
        }
    }

    private down(key: string, row: ROW) {
        const cells = this.rowMap.get(row);
        if (!cells) return;
        const rowIndex = this.cells.indexOf(cells);
        if (rowIndex === -1) return;
        if (rowIndex < this.cells.length - 1) {
            this.cells.splice(rowIndex, 1);
            this.cells.splice(rowIndex + 1, 0, cells);
            const prevRow = this.cells[rowIndex];
            const prevElem = prevRow[prevRow.length - 1];
            for (let i = cells.length - 1; i >= 0; --i) {
                const cell = cells[i];
                cell.orphan();
                prevElem.appendAfter(cell);
            }
            this.emitMove(key);
        }
    }

    private delete(key: string, row: ROW) {
        const rowIndex = this.indexOf(row);
        if (rowIndex === -1) return;
        this.cells.splice(rowIndex, 1);
        for (const e of row) e.dispose();
        this.emitDelete(key);
    }

    private _add(r: ROW, e: Element): TableCell {
        const cell = new TableCell(e);
        this.dom.appendChild(cell.dom);
        return cell;
    }

    public addRow(row: ROW, _key?: string): this {
        const key = _key || "?";
        if (row.length !== this.numColumns) {
            console.error("Failed to add to list: Wrong number of arguments. " +
                "Expected " + this.numColumns + ", got " + row.length);
            return this;
        }
        if (this.reorganizable) {
            row.push(new IconButton(IconType.UP).addCallback(CallbackType.CLICK, () => this.up(key, row)));
            row.push(new IconButton(IconType.DOWN).addCallback(CallbackType.CLICK, () => this.down(key, row)));
        }
        if (this.deletable) {
            row.push(new IconButton(IconType.REMOVE).addCallback(CallbackType.CLICK, () => this.delete(key, row)));
        }
        const cells: TableCell[] = [];
        for (const element of row) cells.push(this._add(row, element));
        this.rowMap.set(row, cells);
        this.cells.push(cells);

        return this;
    }

    public addOnRowDeletedCallback(fun: OnRowMovedCallback) {
        this.rowDeletedCallbacks.push(fun);
        return this;
    }

    public addOnRowMovedCallback(fun: OnRowMovedCallback) {
        this.rowMovedCallbacks.push(fun);
        return this;
    }

    public indexOf(row: ROW): number {
        //return this.rows.indexOf(row);
        const cells = this.rowMap.get(row);
        if (!cells) return -1;
        return this.cells.indexOf(cells);
    }

    public get rowCount(): number {
        return this.cells.length;
    }

    public forEachRow(callback: (r: ROW) => void) {
        for (const cells of this.cells) {
            callback(cells.map(v => v.element) as ROW);
        }
    }

    public getRow(index: number): ROW {
        return this.cells[index].map(v => v.element) as ROW;
    }

    public getLastRow(): ROW {
        return this.getRow(this.rowCount - 1);
    }

    private emitDelete(key: string) {
        for (const c of this.rowDeletedCallbacks) c(key);
    }

    private emitMove(key: string) {
        for (const c of this.rowMovedCallbacks) c(key);
    }
}

export class SimpleFormTable extends Table<[TextElement, Element]> {
    public constructor(header?: string[]) {
        super(2, TableType.FORM, false, false, [0, 1], header);
    }

    /*public addRow(row: [string | TextElement, Element], key?: string): this {
        if (typeof row[0] === "string") row[0] = new TextElement(row[0]);
        super.addRow(row as [TextElement, Element], key);
        return this;
    }*/
}

export default Table;