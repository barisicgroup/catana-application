import { MathUtils, Vector3 } from "three";
import StructureComponent from "../../component/structure-component";
import CgStructureComponent from "../component/cg-structure-component";
import BarChart from "./d3_extensions/bar-chart";
import LineChart from "./d3_extensions/line-chart";
import * as d3 from "d3";
import Structure from "../../structure/structure";
import CgStructure from "../data_model/cg-structure";
import D3Chart from "./d3_extensions/d3-chart";
import { nucleicAcidTypeToString } from "../data_model/types_declarations/polymer-types";

type AcceptedComponents = StructureComponent | CgStructureComponent;

/**
 * Class generating plots for analysis of structural data
 */
export default class StructureAnalysis {
    public static readonly defaultChartColor : string = "steelblue";
    
    private _comp: AcceptedComponents;
    private _container: HTMLElement;

    constructor(parent: HTMLElement, component: AcceptedComponents) {
        this._comp = component;

        this._container = document.createElement("span");
        parent.append(this._container);

        this.createPlots();
    }

    public dispose(): void {
        this._container.remove();
    }

    private createPlots(): void {
        const structure = this._comp instanceof CgStructureComponent ? this._comp.cgStructure : this._comp.structure;

        this._container.append(this.createResiduesChart(structure).node);

        if (structure instanceof CgStructure) {
           this.createCgStrandsCharts(structure).forEach(x => this._container.append(x.node));
        }
    }

    private createResiduesChart(structure: Structure | CgStructure): BarChart {
        let resNamesCounts: Map<string, number> = new Map<string, number>();

        if(structure instanceof Structure) {
            structure.eachResidue(res => {
                const oneLetter = res.resname;
                let val = resNamesCounts.get(oneLetter) ?? 0;
                resNamesCounts.set(oneLetter, val + 1);
            })
        } else {
            structure.forEachMonomer(mon => {
                const oneLetter = mon.residueName;
                let val = resNamesCounts.get(oneLetter) ?? 0;
                resNamesCounts.set(oneLetter, val + 1);
            });
        }

        let residueData: any[] = [];
        resNamesCounts.forEach((freq, rescode) => {
            residueData.push({
                rescode, freq
            })
        });

        return new BarChart(residueData, {
            x: d => d.rescode,
            y: d => d.freq,
            xDomain: d3.groupSort(residueData, ([d]) => -d.freq, d => d.rescode), // sort by descending frequency
            yLabel: "Residue counts",
            color: StructureAnalysis.defaultChartColor
        });
    }

    private createCgStrandsCharts(structure : CgStructure): D3Chart[] {
        const res : D3Chart[] = [];

        structure.forEachNaStrand(str => {
            let twistData: any[] = [];
            let riseData: any[] = [];
            let normalAngleData: any[] = [];

            let lastBaseCenter: Vector3;
            let lastHydrFace: Vector3;
            let lastBaseNormal: Vector3;

            str.forEachNucleotide((nt, i) => {
                let currHydrFace = nt.hydrogenFaceDir.clone();

                if (i > 0) {
                    currHydrFace.projectOnPlane(lastBaseNormal);

                    twistData.push({
                        idx: i,
                        angle: MathUtils.radToDeg(currHydrFace.angleTo(lastHydrFace))
                    });

                    riseData.push({
                        idx: i,
                        rise: nt.nucleobaseCenter.sub(lastBaseCenter).projectOnVector(lastBaseNormal).length()
                    });

                    normalAngleData.push({
                        idx: i,
                        angle: MathUtils.radToDeg(nt.baseNormal.angleTo(lastBaseNormal))
                    })
                }

                lastBaseNormal = nt.baseNormal.clone();
                lastBaseCenter = nt.nucleobaseCenter.clone();
                lastHydrFace = currHydrFace;
            });

            const chartTwist = new LineChart(twistData, {
                x: (d: any) => d.idx,
                y: (d: any) => d.angle,
                yLabel: "Hydrogen faces (not helix) twist angles (deg) for " + nucleicAcidTypeToString(str.naType) + " strand " + str.name,
                color: StructureAnalysis.defaultChartColor
            });

            const chartRise = new LineChart(riseData, {
                x: (d: any) => d.idx,
                y: (d: any) => d.rise,
                yLabel: "Base steps (Å) for " + nucleicAcidTypeToString(str.naType) + " strand " + str.name,
                color: StructureAnalysis.defaultChartColor
            });

            const chartNormalAngle = new LineChart(normalAngleData, {
                x: (d: any) => d.idx,
                y: (d: any) => d.angle,
                yLabel: "Angles between base normals (deg) for " + nucleicAcidTypeToString(str.naType) + " strand " + str.name,
                color: StructureAnalysis.defaultChartColor
            });

            res.push(chartTwist, chartRise, chartNormalAngle);
        });

        return res;
    }
}