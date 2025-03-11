import StructureComponent from "../../component/structure-component";
import Writer from "../../writer/writer";
import CgStructureComponent from "../component/cg-structure-component";
import { getFastaRecordForStructure } from "../utils/catana-sequence-utils";

/**
 * Writer for export of FASTA files
 */
export default class FastaWriter extends Writer {
    public readonly mimeType = "text/plain";
    public readonly defaultName = "sequences";
    public readonly defaultExt = "fasta";

    private readonly _structuresToExport: (StructureComponent | CgStructureComponent)[];

    /**
     * @param structuresToExport array of structure components to be exported
     */
    public constructor(structuresToExport: (StructureComponent | CgStructureComponent)[]) {
        super();
        this._structuresToExport = structuresToExport;
    }

    /** @override */
    public getData(): string {
        let resultingData = "";

        for (let i = 0; i < this._structuresToExport.length; ++i) {
            resultingData += getFastaRecordForStructure(this._structuresToExport[i]);
        }

        return resultingData;
    }
}