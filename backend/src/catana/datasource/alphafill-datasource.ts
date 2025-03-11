import Datasource from "../../datasource/datasource";
import { DatasourceRegistry } from "../../globals";
import { getFileInfo } from "../../loader/loader-utils";

const url = "https://alphafill.eu/v1/aff/";

/**
 * AlphaFill database (containing AlphaFold models enriched with cofactors/ligands)
 * https://alphafill.eu/
 */
class AlphaFillDatasource extends Datasource {
    public getUrl(path: string): string {
        const info = getFileInfo(path);
        return url + info.name.toUpperCase();
    }

    public getExt(path: string): string {
        return "cif";
    }
}

DatasourceRegistry.add("alphafill", new AlphaFillDatasource());

export default AlphaFillDatasource;