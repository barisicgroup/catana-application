// D3
import * as d3 from "d3";

import Component from "../../component/component";
import CgStructureComponent from "../component/cg-structure-component";
import CgNucleicAcidStrand from "../data_model/cg-nucleic-acid-strand";
import CgNucleotideProxy from "../data_model/proxy/cg-nucleotide-proxy";
import { monomerTypeToOneLetterCode } from "../data_model/types_declarations/monomer-types";

type AcceptedObjectTypes = CgNucleicAcidStrand;

type D3_HtmlElement = d3.Selection<HTMLElement, unknown, null, undefined>;
//type D3_SvgElement = d3.Selection<SVGElement, unknown, null, undefined>;
//type D3_Element = D3_HtmlElement | D3_SvgElement;

/**
 * @deprecated It seems there is not use for this class currently.
 * Therefore, it is marked as deprecated and may be potentially removed later on.
 */
export class VisChain {

    private obj: null | AcceptedObjectTypes;
    parent: null | D3_HtmlElement;
    vis: null | D3_HtmlElement;

    constructor(parent?: HTMLElement, comp?: Component) {
        //this.setComponent(comp, false)
        //this.setParent(parent, false);
        //this.update();
    }

    setComponent(comp?: null | Component, update: boolean = true) {
        // TODO Disabled temporarily as it was causing errors

        let obj: null | AcceptedObjectTypes = null;
        if (comp instanceof CgStructureComponent) {
            const dna = comp.cgStructure;
            if (dna.naStrandsCount > 0) {
                obj = dna.naStrands[0];
            }
        }
        if (obj === null) {
            console.warn("Unsupported Component passed to VisChain.\nComponent: " + comp);
        }
        this.obj = obj ? obj : null;
        if (update) this.update();
    }

    setParent(parent?: HTMLElement, update: boolean = true) {
        if (!parent) {
            this.parent = null;
            return;
        }

        if (this.vis) {
            const node = this.vis.node();
            if (node) {
                parent.appendChild(node);
            }
        }
        this.parent = d3.select(parent);
        if (update && !this.vis) {
            this.update();
        }
    }

    public update() {
        if (this.vis) {
            this.vis.remove();
        }
        if (!this.parent) {
            return;
        }
        this.vis = this.parent.append("div")
            .classed("VisChain", true);
        const vis = this.vis;

        if (this.obj instanceof CgNucleicAcidStrand) {
            const nucleotides: Array<CgNucleotideProxy> = new Array<CgNucleotideProxy>(this.obj.length);
            this.obj.forEachNucleotide((np, i) => {
                nucleotides[i] = np.clone();
            });
            VisChain.addNucleotideElements(nucleotides, vis);
        }
    }

    public static addNucleotideElements(nucleotides: Array<CgNucleotideProxy>, parent: D3_HtmlElement) {
        parent.selectAll("div") // Each nucleotide element will be a div
            .data(nucleotides) // For each nucleotide element...
            .enter() // ...create the following element:
            .append("span")
            .classed("VisChainElement", true)
            .html((n) => {
                return monomerTypeToOneLetterCode(n.nucleobaseType);
            })
            .style("background-color", (n) => {
                return "#2CABE2"; // TODO make it depend on the nucleotide type
            })
            .on("click", (e: PointerEvent, n) => {
                // TODO
            })
            .on("mouseover", (e: MouseEvent, n) => {
                // TODO
            });
    }
}

export default VisChain;