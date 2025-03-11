import { getFileInfo } from "../../catana";
import Datasource from "../../datasource/datasource";
import { DatasourceRegistry } from "../../globals";

const urlHead = "https://alphafold.ebi.ac.uk/files/AF-";
const urlTail = "-F1-model_v2.pdb";

/**
 * AlphaFold Protein Structure Database data source
 * @see https://alphafold.ebi.ac.uk/
 */
class AfoldEbiAcDb extends Datasource {
    public getUrl(path: string): string {
        const info = getFileInfo(path);

        return urlHead + info.name.toUpperCase() + urlTail;
    }

    public getExt(path: string): string {
        return "pdb";
    }
}

DatasourceRegistry.add("afoldebidb", new AfoldEbiAcDb());

export default AfoldEbiAcDb;