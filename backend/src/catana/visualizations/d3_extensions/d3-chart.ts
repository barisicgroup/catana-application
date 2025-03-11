import * as d3 from "d3";

/**
 * Default class for charts/graphs/plots based on D3.js library
 */
export default abstract class D3Chart {
    protected svgElement: d3.Selection<SVGSVGElement, undefined, null, undefined>;

    public get node(): SVGSVGElement {
        return Object.assign(this.svgElement.node() as any, { value: null } as any);
    }
}