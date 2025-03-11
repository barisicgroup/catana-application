// Based on the JavaScript Bar Chart code by:
// # Copyright 2021 Observable, Inc.
// # Released under the ISC license.
// # https://observablehq.com/@d3/bar-chart

import * as d3 from "d3";
import D3Chart from "./d3-chart";

/**
 * Default parameters for the D3 bar chart
 */
export const BarChartDefaultParameters = {
    /**
    * Given d in data, returns the (ordinal) x-value
    */
    x: (d: any, i: any) => i,
    /**
     * Given d in data, returns the (quantitative) y-value
     */
    y: (d: any) => d,
    /**
     * Given d in data, returns the title text
     */
    title: undefined as unknown as (d: any, idx?: any, data?: any) => string,
    /**
     * Top margin, in pixels
     */
    marginTop: 20,
    /**
     * Right margin, in pixels
     */
    marginRight: 0,
    /**
     * Bottom margin, in pixels
     */
    marginBottom: 30,
    /**
     * Left margin, in pixels
     */
    marginLeft: 40,
    /**
     * Outer width, in pixels
     */
    width: 640,
    /**
     * Outer height, in pixels
     */
    height: 400,
    /**
     * an array of (ordinal) x-values
     */
    xDomain: undefined as unknown as Iterable<any>,
    /**
     * [left, right]
     */
    xRange: undefined as unknown as [any, any],
    /**
     * Type of y-scale
     */
    yType: d3.scaleLinear,
    /**
     * [ymin, ymax]
     */
    yDomain: undefined as unknown as [any, any],
    /**
     * [bottom, top]
     */
    yRange: undefined as unknown as [any, any],
    /**
     * Amount of x-range to reserve to separate bars
     */
    xPadding: 0.1,
    /**
     * bar fill color
     */
    color: "currentColor",
    /**
     * a format specifier string for the y-axis
     */
    yFormat: undefined as unknown as string,
    /**
     * a label for the y-axis
     */
    yLabel: undefined as unknown as string,
}

export type BarChartParameters = typeof BarChartDefaultParameters;

export default class BarChart extends D3Chart {
    private _data: any;

    public constructor(data: any, params: Partial<BarChartParameters> = {}) {
        super();

        this._data = data;

        const p = Object.assign({}, BarChartDefaultParameters, params);
        p.xRange = p.xRange ?? [p.marginLeft, p.width - p.marginRight];
        p.yRange = p.yRange ?? [p.height - p.marginBottom, p.marginTop];

        this.svgElement = this.createChart(this._data, p);
    }

    private createChart(data: any, params: BarChartParameters) : d3.Selection<SVGSVGElement, undefined, null, undefined> {
        // Compute values.
        const Y = d3.map(data, params.y);
        const X = d3.map(data, params.x);

        // Compute default domains, and unique the x-domain.
        if (params.xDomain === undefined) {
            params.xDomain = X;
        }
        if (params.yDomain === undefined) {
            params.yDomain = [0, d3.max(Y)];
        }
        params.xDomain = new d3.InternSet(params.xDomain);

        // Omit any data not present in the x-domain.
        const I = d3.range(X.length).filter(i => (params.xDomain as any).has(X[i]));

        // Construct scales, axes, and formats.
        const xScale = d3.scaleBand(params.xDomain, params.xRange).padding(params.xPadding);
        const yScale = params.yType(params.yDomain, params.yRange);
        const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
        const yAxis = d3.axisLeft(yScale).ticks(params.height / 40, params.yFormat);

        // Compute titles.
        if (params.title === undefined) {
            const formatValue = yScale.tickFormat(100, params.yFormat);
            params.title = i => `${X[i]}\n${formatValue(Y[i])}`;
        } else {
            const O = d3.map(data, d => d);
            const T = params.title;
            params.title = i => T(O[i], i, data);
        }

        const svg = d3.create("svg")
            .attr("width", params.width)
            .attr("height", params.height)
            .attr("viewBox", [0, 0, params.width, params.height])
            .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

        svg.append("g")
            .attr("transform", `translate(${params.marginLeft},0)`)
            .call(yAxis)
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").clone()
                .attr("x2", params.width - params.marginLeft - params.marginRight)
                .attr("stroke-opacity", 0.1))
            .call(g => g.append("text")
                .attr("x", -params.marginLeft)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text(params.yLabel));

        const bar = svg.append("g")
            .attr("fill", params.color)
            .selectAll("rect")
            .data(I)
            .join("rect")
            .attr("x", i => xScale(X[i]) as any)
            .attr("y", i => yScale(Y[i]))
            .attr("height", i => yScale(0) - yScale(Y[i]))
            .attr("width", xScale.bandwidth());

        if (params.title) {
            bar.append("title")
                .text(params.title);
        }

        svg.append("g")
            .attr("transform", `translate(0,${params.height - params.marginBottom})`)
            .call(xAxis);

        return svg;
    }
}