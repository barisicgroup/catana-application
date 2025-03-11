/**
 * @file Chainname Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker, {StructureColormakerParams, ColormakerScale, CgStructureColormakerParams} from './colormaker'
import AtomProxy from '../proxy/atom-proxy'
import ChainProxy from '../proxy/chain-proxy'
import ModelProxy from '../proxy/model-proxy'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";

export type ChainnameDict = { [k: string]: number }

/**
 * Color by chain name
 */
class ChainnameColormaker extends Colormaker {
  chainnameDictPerModel: { [k: number]: ChainnameDict } = {}
  scalePerModel: { [k: number]: ColormakerScale } = {}

  constructor (params: StructureColormakerParams | CgStructureColormakerParams) {
    super(params)

    if (!params.scale) {
      this.parameters.scale = 'Spectral'
    }

    if (params.structure) { // Catana addition (this if condition)
      params.structure.eachModel((mp: ModelProxy) => {
        let i = 0
        const chainnameDict: ChainnameDict = {}
        mp.eachChain(function (cp: ChainProxy) {
          if (chainnameDict[cp.chainname] === undefined) {
            chainnameDict[cp.chainname] = i
            i += 1
          }
        })
        this.parameters.domain = [0, i - 1]
        this.chainnameDictPerModel[mp.index] = chainnameDict
        this.scalePerModel[mp.index] = this.getScale()
      })
    } else if (params.cgStructure) { // Catana addition (this whole else-if block)
      this.parameters.domain = [0, params.cgStructure.polymerCount - 1];
      let i = 0;
      this.chainnameDictPerModel[0] = {};
      this.scalePerModel[0] = this.getScale();
      params.cgStructure.forEachPolymer((p) => {
        this.chainnameDictPerModel[0][p.globalId] = i++;
      });
      console.assert(i - 1 === this.parameters.domain[1]);
    }
  }

  atomColor (a: AtomProxy) {
    const chainnameDict = this.chainnameDictPerModel[ a.modelIndex ]
    return this.scalePerModel[ a.modelIndex ](chainnameDict[ a.chainname ])
  }

  // Catana addition
  monomerColor(m: CgMonomerProxy): number {
    const i: number = this.chainnameDictPerModel[0][m.getParentPolymer().globalId];
    return this.scalePerModel[0](i);
  }
}

ColormakerRegistry.add('chainname', ChainnameColormaker as any)

export default ChainnameColormaker
