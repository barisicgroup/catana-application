/**
 * @file Bfactor Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { ColormakerRegistry } from '../globals'
import Colormaker, { StructureColormakerParams, ColormakerScale } from './colormaker'
import AtomProxy from '../proxy/atom-proxy'
import Filter from '../filtering/filter'

/**
 * Color by b-factor. The {@link AtomProxy.bfactor} property is used for coloring.
 * By default the min and max b-factor values are used for the scale`s domain.
 *
 * __Name:__ _bfactor_
 *
 * @example
 * stage.loadFile( "rcsb://1crn" ).then( function( o ){
 *     o.addRepresentation( "ball+stick", { colorScheme: "bfactor" } );
 *     o.autoView();
 * } );
 */
class BfactorColormaker extends Colormaker {
  bfactorScale: ColormakerScale

  constructor (params: { filt?: string } & StructureColormakerParams) {
    super(params)

    if (!params.scale) {
      this.parameters.scale = 'OrRd'
    }

    if (!params.domain) {
      let filter
      let min = Infinity
      let max = -Infinity

      if (params.filt) {
        filter = new Filter(params.filt)
      }

      params.structure.eachAtom(function (a) {
        const bfactor = a.bfactor
        min = Math.min(min, bfactor)
        max = Math.max(max, bfactor)
      }, filter)

      this.parameters.domain = [ min, max ]
    }

    this.bfactorScale = this.getScale()
  }

  atomColor (a: AtomProxy) {
    return this.bfactorScale(a.bfactor)
  }
}

ColormakerRegistry.add('bfactor', BfactorColormaker as any)

export default BfactorColormaker
