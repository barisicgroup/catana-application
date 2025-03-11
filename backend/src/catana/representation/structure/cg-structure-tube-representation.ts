import Buffer from "../../../buffer/buffer";
import { CoarseGrainedRepresentationRegistry } from "../../../globals";
import { CgStructureRepresentation, CgStructureUpdateFields } from "./cg-structure-representation";
import CgPolymer from "../../data_model/cg-polymer";
import { CgSpline } from "../../geometry/cg-spline";
import CgStructure from "../../data_model/cg-structure";
import Viewer from "../../../viewer/viewer";
import { RepresentationParameters } from "../../../representation/representation";
import { SplineParameters } from "../../../geometry/spline";
import TubeMeshBuffer from "../../../buffer/tubemesh-buffer";
import CgPolymerView from "../../data_model/views/cg-polymer-view";

export interface CgTubeRepresentationParameters extends RepresentationParameters {
    subdiv: number;
    radialSegments: number;
    tension: number;
    capped: boolean;
    arrowEnded: boolean;
    arrowLength: number;
}

/**
 * Tube representation aims to emphasize the routing of individual polymers.
 */
export class CgStructureTubeRepresentation extends CgStructureRepresentation {
    protected aspectRatio: number;
    protected tension: number;
    protected capped: boolean;
    protected subdiv: number;
    protected arrowEnded: boolean;
    protected arrowLength: number;

    private _polymerViews: CgPolymerView[];

    public constructor(cgStructure: CgStructure, viewer: Viewer, params: Partial<CgTubeRepresentationParameters>) {
        super(cgStructure, viewer, params);
    }

    public init(params: Partial<CgTubeRepresentationParameters>) {
        let p: any = params ?? {};

        p.colorScheme = p.colorScheme ?? "chainname";
        p.colorScale = p.colorScale ?? "RdYlBu";

        this.aspectRatio = 1.0;
        this.tension = p.tension ?? NaN;
        this.capped = p.capped ?? true;
        this.arrowEnded = p.arrowEnded ?? true;
        this.arrowLength = p.arrowLength ?? 6;
        this.radialSegments = 10;

        if (p.quality === "low") {
            this.subdiv = 3;
            this.radialSegments = 5;
        } else if (p.quality === "medium") {
            this.subdiv = 5;
        } else if (p.quality === "high") {
            this.subdiv = 8;
        } else {
            this.subdiv = p.subdiv ?? 6;
        }

        this._filter.signals.stringChanged.add(() => {
            this.build();
        });

        super.init(params);
    }

    public update(what?: CgStructureUpdateFields) {
        if (what && what.color && !what.model) {
            for (let i = 0; i < this._polymerViews.length; ++i) {
                let bufferData: { [key: string]: any } = {}

                const spline = this.getSpline(this._polymerViews[i]);
                const subCol = spline.getSubdividedColor(this.getColorParams());
                bufferData.color = subCol.color;

                this.bufferList[i].setAttributes(bufferData);
            }
        } else {
            super.update();
        }
    }

    protected getSpline(cgPolymerView: CgPolymerView): CgSpline {
        return new CgSpline(cgPolymerView, this.getSplineParams());
    }

    protected getSplineParams(params?: Partial<CgTubeRepresentationParameters>): SplineParameters {
        return Object.assign({
            subdiv: this.subdiv,
            tension: this.tension
        }, params);
    }

    protected createPolymerBuffers(polymer: CgPolymer, buffers: Array<Buffer>): void {
        const polViews = polymer.getViews(this._filter);

        polViews.forEach(polymerView => {
            if (polymerView.length <= 1) { return; }

            this._polymerViews.push(polymerView);

            const spline = this.getSpline(polymerView);

            const subPos = spline.getSubdividedPosition();
            const subOri = spline.getSubdividedOrientation();
            const subCol = spline.getSubdividedColor(this.getColorParams());
            const subPick = spline.getSubdividedPicking();
            const subSize = spline.getSubdividedSize({
                scale: 0.5
            });

            buffers.push(
                new TubeMeshBuffer(
                    Object.assign({}, subPos, subOri, subCol, subPick, subSize),
                    this.getBufferParams({
                        radialSegments: this.radialSegments,
                        aspectRatio: this.aspectRatio,
                        capped: this.capped,
                        arrowEnded: this.arrowEnded && !polymerView.isCyclic(), // Arrow end is desired only for acyclic polymers
                        arrowLength: this.arrowLength
                    })
                )
            );
        });
    }

    protected createBuffers(): Buffer[] {
        const buffers: Array<Buffer> = new Array<Buffer>();
        this._polymerViews = [];

        this.cgStructure.forEachPolymer(cgPolymer => {
            this.createPolymerBuffers(cgPolymer, buffers);
        });

        return buffers;
    }

    protected getType(): string {
        return "tube";
    }
}

CoarseGrainedRepresentationRegistry.add("tube", CgStructureTubeRepresentation);

export default CgStructureTubeRepresentation;