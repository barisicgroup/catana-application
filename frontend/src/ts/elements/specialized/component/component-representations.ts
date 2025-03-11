import {RepresentationColorData, RepresentationsPanel} from "../representation";
import {Component, Representation} from "catana-backend";

export default class ComponentRepresentations extends RepresentationsPanel {
    public constructor(c: Component, colorData?: Map<Representation, RepresentationColorData>) {
        super(c, colorData);
        this.addClass("ComponentRepresentationsPanel");
    }
}
