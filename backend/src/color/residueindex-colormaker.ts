/**
 * @file Residueindex Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import { defaults } from '../utils'
import Colormaker, {StructureColormakerParams, ColormakerScale, CgStructureColormakerParams} from './colormaker'
import AtomProxy from '../proxy/atom-proxy'
import ChainProxy from '../proxy/chain-proxy'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";

/**
 * Color by residue index
 */
class ResidueindexColormaker extends Colormaker {
  scalePerChain: { [k: number]: ColormakerScale } = {}

  constructor (params: StructureColormakerParams | CgStructureColormakerParams) {
    super(params)

    if (!params.scale) {
      this.parameters.scale = 'rainbow'
      this.parameters.reverse = defaults(params.reverse, true)
    }

    if (params.structure) { // Catana addition (this if condition)
      params.structure.eachChain((cp: ChainProxy) => {
        this.parameters.domain = [cp.residueOffset, cp.residueEnd]
        this.scalePerChain[cp.index] = this.getScale()
      })
    } else if (params.cgStructure) { // Catana addition (this if-else block)
      params.cgStructure.forEachPolymer((p) => {
        const store = p.monomerStore;
        let firstIndex, lastIndex;
        if (store.count === 0) {
          firstIndex = 0;
          lastIndex = 0;
        } else {
          firstIndex = store.pdbId[0];
          lastIndex = store.pdbId[store.count - 1];
        }
        this.parameters.domain = [firstIndex, lastIndex];
        this.scalePerChain[p.globalId] = this.getScale();
      });
    }
  }

  atomColor (a: AtomProxy) {
    return this.scalePerChain[ a.chainIndex ](a.residueIndex)
  }

  // Catana addition
  monomerColor(m: CgMonomerProxy): number {
    return this.scalePerChain[ m.getParentPolymer().globalId ](m.pdbId); // Do we really want to use 'pdbId'?
  }
}

ColormakerRegistry.add('residueindex', ResidueindexColormaker as any)

export default ResidueindexColormaker
