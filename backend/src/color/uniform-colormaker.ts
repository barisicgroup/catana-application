/**
 * @file Uniform Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker from './colormaker'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";
import CgMonomerBondProxy from "../catana/data_model/proxy/cg-monomer-bond-proxy";

/**
 * Color by uniform color
 */
class UniformColormaker extends Colormaker {
  atomColor () {
    return this.parameters.value
  }

  bondColor () {
    return this.parameters.value
  }

  valueColor () {
    return this.parameters.value
  }

  volumeColor () {
    return this.parameters.value
  }

  // Catana additions
  monomerColor(m: CgMonomerProxy): number {
    return this.parameters.value;
  }
  monomerBondColor(b: CgMonomerBondProxy): number {
    return this.parameters.value;
  }
}

ColormakerRegistry.add('uniform', UniformColormaker as any, [])

export default UniformColormaker
