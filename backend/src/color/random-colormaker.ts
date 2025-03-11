/**
 * @file Random Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker from './colormaker'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";
import CgMonomerBondProxy from "../catana/data_model/proxy/cg-monomer-bond-proxy";

function randomColor () {
  return Math.random() * 0xFFFFFF
}

/**
 * Class by random color
 */
class RandomColormaker extends Colormaker {
  /**
   * get color for an atom
   * @return {Integer} random hex color
   */
  atomColor () {
    return randomColor()
  }

  /**
   * get color for volume cell
   * @return {Integer} random hex color
   */
  volumeColor () {
    return randomColor()
  }

  /**
   * get color for coordinates in space
   * @return {Integer} random hex color
   */
  positionColor () {
    return randomColor()
  }

  // Catana addition
  monomerColor(m: CgMonomerProxy): number {
    return randomColor();
  }
  monomerBondColor(b: CgMonomerBondProxy): number {
    return randomColor();
  }
}

ColormakerRegistry.add('random', RandomColormaker as any, [])

export default RandomColormaker
