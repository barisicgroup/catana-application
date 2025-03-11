/**
 * @file Geoquality Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker, { StructureColormakerParams } from './colormaker'
import AtomProxy from '../proxy/atom-proxy'
import { countSetBits } from '../math/math-utils'

/**
 * Color by validation gometry quality
 */
class GeoqualityColormaker extends Colormaker {
  geoAtomDict: { [k: string]: { [k: string]: number } } = {}
  geoDict: { [k: string]: number|undefined } = {}

  constructor (params: StructureColormakerParams) {
    super(params)

    const val = params.structure.validation
    if (val) {
      this.geoAtomDict = val.geoAtomDict
      this.geoDict = val.geoDict
    }
  }

  atomColor (atom: AtomProxy) {
    let filt = atom.resno + ''
    if (atom.inscode) filt += '^' + atom.inscode
    if (atom.chainname) filt += ':' + atom.chainname
    filt += '/' + atom.modelIndex

    let geoProblemCount
    const geoAtom = this.geoAtomDict[ filt ]
    if (geoAtom !== undefined) {
      const atomProblems: number = geoAtom[ atom.atomname ] || 0
      geoProblemCount = countSetBits(atomProblems)
    } else {
      geoProblemCount = this.geoDict[ filt ] || 0
    }

    if (geoProblemCount === 0) {
      return 0x2166ac
    } else if (geoProblemCount === 1) {
      return 0xfee08b
    } else if (geoProblemCount === 2) {
      return 0xf46d43
    } else if (geoProblemCount >= 3) {
      return 0xa50026
    }
    return 0x909090
  }
}

ColormakerRegistry.add('geoquality', GeoqualityColormaker as any)

export default GeoqualityColormaker
