/**
 * @file Selection
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Signal } from 'signals'

import { parseFilt } from './filtering-parser'
import {
  FilteringTest, FilteringRule,
  makeAtomTest, makeResidueTest, makeChainTest, makeModelTest, makeCgMonomerTest
} from './filtering-test'
import { FilterAllKeyword, FilterNoneKeyword } from './filtering-constants'

export type FilterSignals = {
  stringChanged: Signal
}

/**
 * Selection
 */
class Filter {
  signals: FilterSignals
  string: string
  filter: FilteringRule

  test: FilteringTest
  residueTest: FilteringTest
  chainTest: FilteringTest
  modelTest: FilteringTest
  cgMonomerTest: FilteringTest; // Catana addition

  atomOnlyTest: FilteringTest
  residueOnlyTest: FilteringTest
  chainOnlyTest: FilteringTest
  modelOnlyTest: FilteringTest
  cgMonomerOnlyTest: FilteringTest; // Catana addition

  /**
   * Create Selection
   * @param {String} string - selection string, see {@tutorial selection-language}
   */
  constructor (string?: string) {
    this.signals = {
      stringChanged: new Signal()
    }

    this.setString(string)
  }

  get type () { return 'selection' }

  setString (string?: string, silent?: boolean) {
    if (string === undefined) string = this.string || ''
    if (string === this.string) return

    try {
      this.filter = parseFilt(string)
    } catch (e) {
      // Log.error( e.stack );
      this.filter = { 'error': e.message }
    }
    const filter = this.filter

    this.string = string

    this.test = makeAtomTest(filter)
    this.residueTest = makeResidueTest(filter)
    this.chainTest = makeChainTest(filter)
    this.modelTest = makeModelTest(filter)
    this.cgMonomerTest = makeCgMonomerTest(filter); // Catana addition

    this.atomOnlyTest = makeAtomTest(filter, true)
    this.residueOnlyTest = makeResidueTest(filter, true)
    this.chainOnlyTest = makeChainTest(filter, true)
    this.modelOnlyTest = makeModelTest(filter, true)
    this.cgMonomerOnlyTest = makeCgMonomerTest(filter, true); // Catana addition

    if (!silent) {
      this.signals.stringChanged.dispatch(this.string)
    }
  }

  isAllFilter () {
    return FilterAllKeyword.includes(this.string.toUpperCase())
  }

  isNoneFilter () {
    return FilterNoneKeyword.includes(this.string.toUpperCase())
  }
}

export default Filter
