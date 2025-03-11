/**
 * @file Randomcoilindex Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker, { StructureColormakerParams, ColormakerScale } from './colormaker'
import AtomProxy from '../proxy/atom-proxy'

/**
 * Color by random coil index
 */
class RandomcoilindexColormaker extends Colormaker {
  rciScale: ColormakerScale
  rciDict: { [k: string]: number|undefined } = {}

  constructor (params: StructureColormakerParams) {
    super(params)

    if (!params.scale) {
      this.parameters.scale = 'RdYlBu'
    }

    this.rciScale = this.getScale({ domain: [ 0.6, 0 ] })

    const val = params.structure.validation
    if (val) this.rciDict = val.rciDict

  }

  atomColor (atom: AtomProxy) {
    let filt = `[${atom.resname}]${atom.resno}`
    if (atom.chainname) filt += ':' + atom.chainname

    const rci = this.rciDict[ filt ]
    return rci !== undefined ? this.rciScale(rci) : 0x909090
  }
}

ColormakerRegistry.add('randomcoilindex', RandomcoilindexColormaker as any)

export default RandomcoilindexColormaker
