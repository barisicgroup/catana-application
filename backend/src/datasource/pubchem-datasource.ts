/**
 * @file PubChem Datasource
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Log, DatasourceRegistry } from '../globals'
import { getFileInfo } from '../loader/loader-utils'
import Datasource from './datasource'

const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/' // Catana modification
const suffixUrl = '/SDF?record_type=3d'

class PubchemDatasource extends Datasource {
  getUrl (src: string) {
    const info = getFileInfo(src)
    const cid = info.name
    let url
    if (!info.ext || info.ext === 'sdf') {
      url = baseUrl + cid + suffixUrl
    } else {
      Log.warn('unsupported ext', info.ext)
      url = baseUrl + cid + suffixUrl
    }
    return url // Catana modification
  }

  getExt (src: string) {
    const ext = getFileInfo(src).ext
    return ext ? ext : 'sdf'
  }
}

DatasourceRegistry.add('pubchem', new PubchemDatasource())

export default PubchemDatasource
