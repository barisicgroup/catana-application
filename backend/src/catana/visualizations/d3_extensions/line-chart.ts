// Based on the JavaScript Line Chart code by:
// # Copyright 2021 Observable, Inc.
// # Released under the ISC license.
// # https://observablehq.com/@d3/line-with-tooltip

import * as d3 from "d3";
import D3Chart from "./d3-chart";

/**
 * Default parameters for the D3 line chart
 */
export const LineChartDefaultParameters = {
  /**
   * Given d in data, returns the (temporal) x-value
   */
  x: ([x]: [any]) => x,
  /**
   * Given d in data, returns the (quantitative) y-value
   */
  y: ([, y]: [any, any]) => y,
  /**
   * Given d in data, returns the title text
   */
  title: undefined as unknown as (d: any, idx?: any, data?: any) => string,
  /**
   * For gaps in data
   */
  defined: undefined as unknown as any,
  /**
   * Method of interpolation between points
   */
  curve: d3.curveLinear,
  /**
   * Top margin, in pixels
   */
  marginTop: 20,
  /**
   * Right margin, in pixels
   */
  marginRight: 30,
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
   * Type of x-scale
   */
  xType: d3.scaleLinear,
  /**
   * [xmin, xmax]
   */
  xDomain: undefined as unknown as [any, any],
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
   * stroke color of line
   */
  color: "currentColor",
  /**
   * stroke width of line, in pixels
   */
  strokeWidth: 1.5,
  /**
   * stroke line join of line
   */
  strokeLinejoin: "round",
  /**
   * stroke line cap of line
   */
  strokeLinecap: "round",
  /**
   * a format specifier string for the y-axis
   */
  yFormat: undefined as unknown as string,
  /**
   * a label for the y-axis
   */
  yLabel: undefined as unknown as string,
}

export type LineChartParameters = typeof LineChartDefaultParameters;

/**
 * Line chart based on D3.js functionality
 */
export default class LineChart extends D3Chart {
  private _data: any;
  private _startingParams: LineChartParameters;

  public constructor(data: any, params: Partial<LineChartParameters> = {}) {
    super();

    this._data = data;

    const p = Object.assign({}, LineChartDefaultParameters, params);
    p.xRange = p.xRange ?? [p.marginLeft, p.width - p.marginRight];
    p.yRange = p.yRange ?? [p.height - p.marginBottom, p.marginTop];
    
    this._startingParams = Object.assign({}, p);
    this.svgElement = this.createChart(this._data, p);
  }

  public updateChart(data: any): void {
    // TODO This is rather lame way of updating the chart
    const p = Object.assign({}, this._startingParams);
    this.createChart(data, p, this.svgElement);
  }

  private createChart(data: any, params: LineChartParameters,
    existingSvgElem?: d3.Selection<SVGSVGElement, undefined, null, undefined>): d3.Selection<SVGSVGElement, undefined, null, undefined> {
    if (existingSvgElem) {
      existingSvgElem.selectAll("*").remove();
    }

    // Compute values.
    const X = d3.map(data, params.x);
    const Y = d3.map(data, params.y);
    const O = d3.map(data, d => d);
    const I = d3.map(data, (_, i) => i);

    // Compute which data points are considered defined.
    if (params.defined === undefined) {
      params.defined = (d: any, i: any) => !isNaN(X[i] as any) && !isNaN(Y[i] as any);
    }
    const D = d3.map(data, params.defined);

    // Compute default domains.
    if (params.xDomain === undefined) {
      params.xDomain = d3.extent(X as any);
    }
    if (params.yDomain === undefined) {
      params.yDomain = [0, d3.max(Y as any)];
    }

    // Construct scales and axes.
    const xScale = params.xType(params.xDomain, params.xRange) as any;
    const yScale = params.yType(params.yDomain, params.yRange) as any;
    const xAxis = d3.axisBottom(xScale).ticks(params.width / 80).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(params.height / 40, params.yFormat);

    // Compute titles.
    if (params.title === undefined) {
      const formatValue = yScale.tickFormat(100, params.yFormat);
      params.title = (i: any) => `${X[i]}: \n${formatValue(Y[i])}`;
    } else {
      const O = d3.map(data, d => d);
      const T = params.title;
      params.title = (i: any) => T(O[i], i, data);
    }

    // Construct a line generator.
    const line = d3.line()
      .defined((i: any) => D[i as any] as any)
      .curve(params.curve)
      .x(i => xScale(X[i as any]))
      .y(i => yScale(Y[i as any]));

    const svg = (existingSvgElem ?? d3.create("svg"))
      .attr("width", params.width)
      .attr("height", params.height)
      .attr("viewBox", [0, 0, params.width, params.height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .style("-webkit-tap-highlight-color", "transparent")
      .style("overflow", "visible");

    if (!existingSvgElem) {
      svg
        .on("pointerenter pointermove", pointermoved)
        .on("pointerleave", pointerleft)
        .on("touchstart", event => event.preventDefault());
    }

    svg.append("g")
      .attr("transform", `translate(0,${params.height - params.marginBottom})`)
      .call(xAxis);

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

    svg.append("path")
      .attr("fill", "none")
      .attr("stroke", params.color)
      .attr("stroke-width", params.strokeWidth)
      .attr("stroke-linejoin", params.strokeLinejoin)
      .attr("stroke-linecap", params.strokeLinecap)
      .attr("d", line(I as any));

    const tooltip = svg.append("g")
      .style("pointer-events", "none");

    function pointermoved(event: any) {
      const i = d3.bisectCenter(X as any, xScale.invert(d3.pointer(event)[0]));
      tooltip.style("display", null);
      tooltip.attr("transform", `translate(${xScale(X[i])},${yScale(Y[i])})`);

      const path = tooltip.selectAll("path")
        .data([,])
        .join("path")
        .attr("fill", "white")
        .attr("stroke", "black");

      const text = tooltip.selectAll("text")
        .data([,])
        .join("text")
        .call(text => text
          .selectAll("tspan")
          .data(`${params.title(i)}`.split(/\n/))
          .join("tspan")
          .attr("x", 0)
          .attr("y", (_, i) => `${i * 1.1}em`)
          .attr("font-weight", (_, i) => i ? null : "bold")
          .text(d => d));

      const { x, y, width: w, height: h } = (text.node()! as any).getBBox();
      x; // Only to silence "not-used" error
      text.attr("transform", `translate(${-w / 2},${15 - y})`);
      path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
      svg.property("value", O[i] as any).dispatch("input", { bubbles: true } as any);
    }

    function pointerleft() {
      tooltip.style("display", "none");
      (svg.node()! as any).value = null;
      svg.dispatch("input", { bubbles: true } as any);
    }

    return svg;
  }
}