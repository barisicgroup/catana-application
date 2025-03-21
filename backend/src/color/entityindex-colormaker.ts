/**
 * @file Entityindex Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker, { StructureColormakerParams, ColormakerScale } from './colormaker'
import AtomProxy from '../proxy/atom-proxy'

/**
 * Color by entity index
 */
class EntityindexColormaker extends Colormaker {
  entityindexScale: ColormakerScale

  constructor (params: StructureColormakerParams) {
    super(params)

    if (!params.scale) {
      this.parameters.scale = 'Spectral'
    }
    if (!params.domain) {
      this.parameters.domain = [ 0, params.structure.entityList.length - 1 ]
    }

    this.entityindexScale = this.getScale()
  }

  atomColor (a: AtomProxy) {
    return this.entityindexScale(a.entityIndex)
  }
}

ColormakerRegistry.add('entityindex', EntityindexColormaker as any)

export default EntityindexColormaker
