import Datasource from "../../datasource/datasource";
import { DatasourceRegistry } from "../../globals";
import { getFileInfo } from "../../loader/loader-utils";
import { getAbsolutePath } from "../../utils";

const dataSourceStorageRelativePath: string = "dist/catana_data/";

/**
 * Data source referring to the "local" folder provided together with Catana builds
 */
class CatanaDatasource extends Datasource {
    getUrl(filePath: string) {
        return getAbsolutePath(dataSourceStorageRelativePath + getFileInfo(filePath).path);
    }

    getExt(filePath: string) {
        return getFileInfo(filePath).ext;
    }
}

DatasourceRegistry.add("catana", new CatanaDatasource());

export default CatanaDatasource;