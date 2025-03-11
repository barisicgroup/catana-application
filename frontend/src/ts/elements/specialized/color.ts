import Element from "../element";
import Panel from "../panel";

export enum ColorBarSize {
    MINIMAL, WIDE
}

export class ColorBar extends Element<HTMLSpanElement> {
    constructor(color: string) {
        super(document.createElement("span"));
        this.addClass("ColorBar");
        this.setColor(color);
    }
    public setColor(color: string) {
        this.getStyle().background = color;
    }
}

export class ColorSequence extends Panel {
    private readonly bars: ColorBar[];
    constructor(size: ColorBarSize, colors: string[] = []) {
        super();
        this.dom.className = "ColorSequence";
        this.bars = [];
        this.addColors(...colors);
        this.setSize(size);
    }
    public addColors(...colors: string[]) {
        for (const c of colors) {
            const bar = new ColorBar(c);
            this.bars.push(bar);
            this.add(bar);
        }
    }
    public setColors(...colors: string[]) {
        this.clear();
        this.addColors(...colors);
    }
    public setSize(size: ColorBarSize) {
        this.removeClass("Wide");
        switch (size) {
            case ColorBarSize.WIDE:
                this.addClass("Wide");
                break;
            case ColorBarSize.MINIMAL:
            default:
                // Do nothing
                break;
        }
    }
}