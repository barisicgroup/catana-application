class VisArray {
    constructor(data) {
        const div = document.createElement("span");
        div.className = "vis-array";
        const feedback = document.createElement("span");
        feedback.className = "vis-array-text";
        const text = "(" + data.length + ")";
        feedback.textContent = text;
        for (let i = 0; i < data.length; ++i) {
            const v = data[i];
            const e = document.createElement("span");
            e.className = "vis-array-element";
            e.textContent = v;
            e.title = "Index: " + i + "\nValue: " + v;
            if (i > 0) div.insertAdjacentText("beforeend", ",");
            div.insertAdjacentElement("beforeend", e);
        }
        //div.appendChild(feedback);
        div.insertAdjacentText("beforeend", " ");
        div.insertAdjacentElement("beforeend", feedback);

        this.container = div;
    }
}

class VisMatrix {
    constructor(data, shape, binWidth, binHeight) {
        const width = shape[0] * binWidth;
        const height = shape[1] * binHeight;

        this.shape = shape;

        this.svg = d3.create("svg")
            .attr("viewBox", [0, 0, width, height]);

        const grid2d = new Array(shape[0] * shape[1]);
        for (let z = 0; z < shape[2]; ++z) {
            for (let xy = 0; xy < grid2d.length; ++xy) {
                if (z === 0) {
                    grid2d[xy] = new Float32Array(shape[2]);
                }
                grid2d[xy][z] = data[xy + (z * grid2d.length)];
            }
        }
        //console.log(grid2d);

        //data = Array.from(Array(27000).keys());
        const extent = d3.extent(data);
        const extent_reduced = d3.extent(grid2d.map(v => v.reduce((a, b) => a + b)));

        this.func = d3.scaleLinear()
            .range(["white", "#2CABE2"])
            .domain(extent);
            //.domain([0, 27000]);
        this.func_reduced = d3.scaleLinear()
            .range(["white", "#2CABE2"])
            .domain(extent_reduced);
        const funx = d3.scaleLinear()
            .range([0, width])
            .domain([0, shape[0]]);
        const funy = d3.scaleLinear()
            .range([0, height])
            .domain([0, shape[1]]);

        this._layer = 0;
        this._reduce = true;

        this.bins = this.svg.selectAll()
            /*.data(data.keys(), (d) => {
                return { i: d, v: data[d] };
            })*/
            .data(grid2d.map((v, i) => {
                const x = i % shape[0];
                const y = Math.floor(i / shape[0]);
                const z_array = grid2d[i];
                const sum = z_array.reduce((a, b) => a + b);
                return { x: x, y: y, z_array: z_array, sum: sum }
                //console.log(obj);
                //return obj;
            }))
            .enter()
            .append("rect")
            .attr("class", "vis-matrix-bin")
            .attr("x", d => funx(d.x))
            .attr("y", d => funy(d.y))
            .attr("width", binWidth)
            .attr("height", binHeight)
            .on("click", (event, d) => {
                console.log(d);
            })
            .on("mouseenter", (event, d) => {
                for (const f of this.onHover) f(d);
            })
            .on("mouseleave", (event, d) => {
                for (const f of this.onHover) f();
            });

        this.onHover = [];

        this.container = document.createElement("div");
        this.container.className = "vis-matrix";
        this.container.appendChild(this.svg.node());

        this._update();
    }

    _update() {
        if (this._reduce) {
            this.bins
                .style("fill", d => this.func_reduced(d.sum));
        } else {
            this.bins
                .style("fill", d => this.func(d.z_array[this._layer]));
        }
    }

    get layer() {
        return this._layer;
    }

    set layer(layer) {
        this._layer = layer;
        this._update();
    }

    get reduce() {
        return this._reduce;
    }

    set reduce(reduce) {
        this._reduce = reduce;
        this._update();
    }

    get layerExtent() {
        return [0, this.shape[2] - 1];
    }

    addOnHoverFun(f) {
        this.onHover.push(f);
    }
}

class VisBarChart {
    static HEIGHT = 400;
    constructor(data) {
        const div = document.createElement("div");
        div.className = "vis-bar-chart";
        div.style.maxHeight = VisBarChart.HEIGHT + "px";
        this.container = div;

        this.legend = document.createElement("div");
        this.legend.className = "legend";
        this.container.appendChild(this.legend);

        this.bars = [];
        this.maxValue = 0;
        if (data) {
            for (const d of data) {
                if (d) this.addData(d);
                else this.addSpace();
            }
        }
    }
    addData(d) {
        const bar = document.createElement("div");
        bar.className = "bar";
        if (d) {
            if (d.value) {
                this.bars.push({bar: bar, value: d.value});
                this.maxValue = this.bars.map(v => v.value).reduce((a,b) => Math.max(a,b));
                for (const b of this.bars) {
                    b.bar.style.height = (b.value / this.maxValue * VisBarChart.HEIGHT) + "px";
                }
            }
            bar.style.background = d.color ? d.color : "gray";
            bar.textContent = d.text ? d.text : (d.value ? d.value : "");
        }
        this.container.appendChild(bar);
    }
    addSpace() {
        this.addData();
    }
    addLegend(text, color) {
        const span = document.createElement("span");
        span.style.background = color;
        span.textContent = text;
        this.legend.appendChild(span);
    }
}