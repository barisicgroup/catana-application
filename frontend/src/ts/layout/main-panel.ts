import Panel, { PanelOrientation } from "../elements/panel";
import Element from "../elements/element";

export abstract class MainPanel extends Panel {

    private _start: Panel;
    private _end: Panel;

    protected constructor(orientation: PanelOrientation) {
        super(orientation);
        this.addClass("Main");
        this._start = new Panel(orientation).addClass("Start");
        this._end = new Panel(orientation).addClass("End");
        super.add(this._start, this._end);
    }

    public add(...elements) {
        this._start.add(...elements);
        return this;
    }

    public addToRoot(...elements: Element[]): void {
        super.add(...elements);
    }

    protected get start(): Panel {
        return this._start;
    }

    protected get end(): Panel {
        return this._end;
    }

    public abstract setDimensionsRem(dim: { [id: string]: number }): void;

    protected static NARROW: number = 2;
    protected static WIDE: number = 4;
    protected static FULL: number = 20;
}

export default MainPanel;