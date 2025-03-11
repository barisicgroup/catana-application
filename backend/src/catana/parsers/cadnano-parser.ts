import Parser, { ParserParameters } from "../../parser/parser";
import Streamer from "../../streamer/streamer";
import UnfParser from "./unf-parser";
import StringStreamer from "../../streamer/string-streamer";
import { ParserParametersRegistry, ParserRegistry } from "../../globals";

/**
 * Cadnano parser parameters
 */
interface CadnanoParserParameters extends ParserParameters {
    latticeType: string,
    originAtCenterOfMass: boolean
}

/**
 * Parser parsing cadnano JSON files.
 * More precisely, the parser forwards the input data to the Catana server,
 * where cadnano to UNF parsing is performed, and the outcomes of this parsing
 * are then processed by {@link UnfParser}.
 */
class CadnanoParser extends Parser {

    private readonly latticeType: string;
    private readonly originAtCenterOfMass: boolean;

    constructor(streamer: Streamer, params?: Partial<CadnanoParserParameters>) {
        super(streamer, params || {});
        this.sceneData = null;
        this.latticeType = params?.latticeType || "square";
        this.originAtCenterOfMass = params?.originAtCenterOfMass ?? false;
    }

    get type() {
        return "cadnano";
    }

    get __objName() {
        return "sceneData";
    }

    get isJson() {
        return true;
    }

    parse(): Promise<any> {
        const latticeType = this.latticeType;
        return this.streamer.read().then(() => {
            let data = this.streamer.asText();

            // TODO FIXME This is not a nice solution but it is necessary for some reason in some cases...
            if (typeof data !== "string") {
                data = JSON.stringify(data);
            }

            return fetch("THIS_WAS_REMOVED", { // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                method: "POST",
                body: JSON.stringify({
                    cadnano: data,
                    lattice_type: latticeType
                }),
                headers: {
                    //"Content-Type": "application/json"
                    "Content-Type": "text/plain"
                }
            });
        }).then((response) => {
            // Here, we can use the result of the response from the server!
            if (!response.ok || response.body === null) {
                // TODO handle errors
                //console.error("Problem with POST request");
                //console.warn("JSON could not be converted. Possibly, it wasn't recognized as Cadnano. Falling back to default JSON parser");
                //return super.parse();
                throw "JSON could not be converted. Possibly, it wasn't recognized as Cadnano. Falling back to default JSON parser"; // TODO better message (not necessarily "conversion"...)

            } else {
                return response.json();
            }
        }, reason => console.error(reason))
            .then((responseObject) => {
                if (!responseObject || !responseObject.succeeded) {
                    throw "JSON conversion did not succeed. Message:" + responseObject.message; // TODO better message (not necessarily "conversion"...)
                }
                return new UnfParser(new StringStreamer(responseObject.unf), {
                    originAtCenterOfMass: this.originAtCenterOfMass
                }).parse();

            }).then((sceneData) => {
                this.sceneData = sceneData;
                this._beforeParse();
                this._parse();
                this._afterParse();
                return sceneData;
            });
    }
}

ParserRegistry.add("json", CadnanoParser);
ParserParametersRegistry.add("json", {
    latticeType: {
        name: "Lattice type",
        type: "select",
        options: {
            square: "Square",
            honeycomb: "Honeycomb"
        }
    },
    originAtCenterOfMass: {
        name: "Center at world origin",
        type: "checkbox",
        isChecked: false
    }
});

export default CadnanoParser;