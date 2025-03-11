/**
 * @file Radius Factory
 * @author Alexander Rose <alexander.rose@weirdbyte.de>. modified by Catana dev team (added cgMonomerRadius function)
 * @private
 */

import { defaults } from '../utils'
import { NucleicBackboneAtoms } from '../structure/structure-constants'
import AtomProxy from '../proxy/atom-proxy'
import CgMonomerProxy from '../catana/data_model/proxy/cg-monomer-proxy'

export const RadiusFactoryTypes = {
  '': '',
  'vdw': 'by vdW radius',
  'covalent': 'by covalent radius',
  'sstruc': 'by secondary structure',
  'bfactor': 'by bfactor',
  'size': 'size',
  'data': 'data',
  'explicit': 'explicit'
}
export type RadiusType = keyof typeof RadiusFactoryTypes

export interface RadiusParams {
  type?: RadiusType
  scale?: number
  size?: number
  data?: { [k: number]: number }
}

class RadiusFactory {
  max = 10

  static types = RadiusFactoryTypes

  readonly type: RadiusType
  readonly scale: number
  readonly size: number
  readonly data: { [k: number]: number }

  constructor(params: RadiusParams = {}) {
    this.type = defaults(params.type, '')
    this.scale = defaults(params.scale, 1)
    this.size = defaults(params.size, 1)
    this.data = defaults(params.data, {})
  }

  atomRadius(a: AtomProxy) {
    let r

    switch (this.type) {
      case 'vdw':
        r = a.vdw
        break

      case 'covalent':
        r = a.covalent
        break

      case 'bfactor':
        r = a.bfactor || 1.0
        break

      case 'sstruc':
        const sstruc = a.sstruc
        if (sstruc === 'h') {
          r = 0.25
        } else if (sstruc === 'g') {
          r = 0.25
        } else if (sstruc === 'i') {
          r = 0.25
        } else if (sstruc === 'e') {
          r = 0.25
        } else if (sstruc === 'b') {
          r = 0.25
        } else if (NucleicBackboneAtoms.includes(a.atomname)) {
          r = 0.4
        } else {
          r = 0.1
        }
        break

      case 'data':
        r = defaults(this.data[a.index], 1.0)
        break

      case 'explicit':
        // defaults is inappropriate as AtomProxy.radius returns
        // null for missing radii
        r = a.radius
        if (r === null) r = this.size
        break

      default:
        r = this.size
        break
    }

    return Math.min(r * this.scale, this.max)
  }

  cgMonomerRadius(m: CgMonomerProxy) {
    let r: number;

    switch (this.type) {
      case "size":
        r = this.size;
        break;
      case "data":
        const thisRad = this.data[m.globalId];
        if (thisRad) {
          r = thisRad;
          // This break is intentionally in the condition
          break;
        }
      default:
        r = m.getParentPolymer().isNucleic() ?
          (3.32 / 3 * 2) :
          (3.32 / 3 * 1.5);
        break;
    }

    return Math.min(r * this.scale, this.max);
  }

}

export default RadiusFactory
