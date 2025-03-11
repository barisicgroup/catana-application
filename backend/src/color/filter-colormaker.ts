/**
 * @file Filter Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Color } from 'three'

import { ColormakerRegistry } from '../globals'
import Filter from '../filtering/filter'
import Colormaker, { ColormakerParameters } from './colormaker'
import AtomProxy from '../proxy/atom-proxy'
import Structure from '../structure/structure'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";
import CgStructure from "../catana/data_model/cg-structure";

export type FilterSchemeData = [ any, string, ColormakerParameters|undefined ]

/**
 * Color based on {@link Filter}
 */
class FilterColormaker extends Colormaker {
  colormakerList: any[] = []  // TODO
  filterList: Filter[] = []

  constructor (params: ({ structure: Structure } | { cgStructure: CgStructure }) & { dataList: FilterSchemeData[] } & Partial<ColormakerParameters>) {
    super(params)

    const dataList = params.dataList || []

    dataList.forEach((data: FilterSchemeData) => {
      const [ scheme, filt, params = {} ] = data

      if (ColormakerRegistry.hasScheme(scheme)) {
        Object.assign(params, {
          scheme: scheme,
          structure: this.parameters.structure,
          cgStructure: this.parameters.cgStructure
        })
      } else {
        Object.assign(params, {
          scheme: 'uniform',
          value: new Color(scheme).getHex()
        })
      }

      this.colormakerList.push(ColormakerRegistry.getScheme(params as { scheme: string } & ColormakerParameters))
      this.filterList.push(new Filter(filt))
    })
  }

  atomColor (a: AtomProxy) {
    for (let i = 0, n = this.filterList.length; i < n; ++i) {
      const test = this.filterList[ i ].test
      if (test && test(a)) {
        return this.colormakerList[ i ].atomColor(a)
      }
    }

    return 0xFFFFFF
  }

  // Catana addition
  monomerColor(m: CgMonomerProxy): number {
    for (let i = 0, n = this.filterList.length; i < n; ++i) {
      const test = this.filterList[ i ].cgMonomerTest;
      if (test && test(m)) {
        return this.colormakerList[i].monomerColor(m);
      }
    }
    return 0xFFFFFF;
  }
}

export default FilterColormaker
