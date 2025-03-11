/**
 * @file Filtering Test
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { binarySearchIndexOf, rangeInSortedArray } from '../utils'
import { kwd, AtomOnlyKeywords, ChainKeywords } from './filtering-constants'

import AtomProxy from '../proxy/atom-proxy'
import ResidueProxy from '../proxy/residue-proxy'
import ChainProxy from '../proxy/chain-proxy'
import ModelProxy from '../proxy/model-proxy'
import CgMonomerProxy from "../catana/data_model/proxy/cg-monomer-proxy";
import CgNucleicAcidStrand from '../catana/data_model/cg-nucleic-acid-strand'

// Catana addition: CgMonomerProxy
export type ProxyEntity = AtomProxy | ResidueProxy | ChainProxy | ModelProxy | CgMonomerProxy
type TestEntityFn = (e: ProxyEntity, s: FilteringRule) => boolean | -1
type FilterFn = (s: FilteringRule) => boolean
export type FilteringTest = false | ((e: ProxyEntity) => boolean | -1)

export type FilteringOperator = 'AND' | 'OR'
export interface FilteringRule {
  keyword?: any
  atomname?: string
  element?: string
  atomindex?: number[]
  altloc?: string
  inscode?: string
  resname?: string | string[]
  sstruc?: string
  resno?: number | [number, number]
  chainname?: string
  model?: number
  scaffold?: boolean
  staple?: boolean

  error?: string
  rules?: FilteringRule[]
  negate?: boolean
  operator?: FilteringOperator
}

function atomTestFn(a: AtomProxy, s: FilteringRule) {
  // returning -1 means the rule is not applicable
  if (s.atomname === undefined && s.element === undefined &&
    s.altloc === undefined && s.atomindex === undefined &&
    s.keyword === undefined && s.inscode === undefined &&
    s.resname === undefined && s.sstruc === undefined &&
    s.resno === undefined && s.chainname === undefined &&
    s.model === undefined
  ) return -1

  if (s.keyword !== undefined) {
    if (s.keyword === kwd.BACKBONE && !a.isBackbone()) return false
    if (s.keyword === kwd.SIDECHAIN && !a.isSidechain()) return false
    if (s.keyword === kwd.BONDED && !a.isBonded()) return false
    if (s.keyword === kwd.RING && !a.isRing()) return false
    if (s.keyword === kwd.AROMATICRING && !a.isAromatic()) return false

    if (s.keyword === kwd.HETERO && !a.isHetero()) return false
    if (s.keyword === kwd.PROTEIN && !a.isProtein()) return false
    if (s.keyword === kwd.NUCLEIC && !a.isNucleic()) return false
    if (s.keyword === kwd.RNA && !a.isRna()) return false
    if (s.keyword === kwd.DNA && !a.isDna()) return false
    if (s.keyword === kwd.POLYMER && !a.isPolymer()) return false
    if (s.keyword === kwd.WATER && !a.isWater()) return false
    if (s.keyword === kwd.HELIX && !a.isHelix()) return false
    if (s.keyword === kwd.SHEET && !a.isSheet()) return false
    if (s.keyword === kwd.TURN && !a.isTurn()) return false
    if (s.keyword === kwd.ION && !a.isIon()) return false
    if (s.keyword === kwd.SACCHARIDE && !a.isSaccharide()) return false
    if (s.keyword === kwd.METAL && !a.isMetal()) return false
    if (s.keyword === kwd.POLARH && !a.isPolarHydrogen()) return false
  }

  if (s.atomname !== undefined && s.atomname !== a.atomname) return false
  if (s.element !== undefined && s.element !== a.element) return false
  if (s.altloc !== undefined && s.altloc !== a.altloc) return false

  if (s.atomindex !== undefined &&
    binarySearchIndexOf(s.atomindex, a.index) < 0
  ) return false

  if (s.resname !== undefined) {
    if (Array.isArray(s.resname)) {
      if (!s.resname.includes(a.resname)) return false
    } else {
      if (s.resname !== a.resname) return false
    }
  }
  if (s.sstruc !== undefined && s.sstruc !== a.sstruc) return false
  if (s.resno !== undefined) {
    if (Array.isArray(s.resno) && s.resno.length === 2) {
      if (s.resno[0] > a.resno || s.resno[1] < a.resno) return false
    } else {
      if (s.resno !== a.resno) return false
    }
  }
  if (s.inscode !== undefined && s.inscode !== a.inscode) return false

  if (s.chainname !== undefined && s.chainname !== a.chainname) return false
  if (s.model !== undefined && s.model !== a.modelIndex) return false

  return true
}

function residueTestFn(r: ResidueProxy, s: FilteringRule) {
  // returning -1 means the rule is not applicable
  if (s.resname === undefined && s.resno === undefined && s.inscode === undefined &&
    s.sstruc === undefined && s.model === undefined && s.chainname === undefined &&
    s.atomindex === undefined &&
    (s.keyword === undefined || AtomOnlyKeywords.includes(s.keyword))
  ) return -1

  if (s.keyword !== undefined) {
    if (s.keyword === kwd.HETERO && !r.isHetero()) return false
    if (s.keyword === kwd.PROTEIN && !r.isProtein()) return false
    if (s.keyword === kwd.NUCLEIC && !r.isNucleic()) return false
    if (s.keyword === kwd.RNA && !r.isRna()) return false
    if (s.keyword === kwd.DNA && !r.isDna()) return false
    if (s.keyword === kwd.POLYMER && !r.isPolymer()) return false
    if (s.keyword === kwd.WATER && !r.isWater()) return false
    if (s.keyword === kwd.HELIX && !r.isHelix()) return false
    if (s.keyword === kwd.SHEET && !r.isSheet()) return false
    if (s.keyword === kwd.TURN && !r.isTurn()) return false
    if (s.keyword === kwd.ION && !r.isIon()) return false
    if (s.keyword === kwd.SACCHARIDE && !r.isSaccharide()) return false
  }

  if (s.atomindex !== undefined &&
    rangeInSortedArray(s.atomindex, r.atomOffset, r.atomEnd) === 0
  ) return false

  if (s.resname !== undefined) {
    if (Array.isArray(s.resname)) {
      if (!s.resname.includes(r.resname)) return false
    } else {
      if (s.resname !== r.resname) return false
    }
  }
  if (s.sstruc !== undefined && s.sstruc !== r.sstruc) return false
  if (s.resno !== undefined) {
    if (Array.isArray(s.resno) && s.resno.length === 2) {
      if (s.resno[0] > r.resno || s.resno[1] < r.resno) return false
    } else {
      if (s.resno !== r.resno) return false
    }
  }
  if (s.inscode !== undefined && s.inscode !== r.inscode) return false

  if (s.chainname !== undefined && s.chainname !== r.chainname) return false
  if (s.model !== undefined && s.model !== r.modelIndex) return false

  return true
}

function chainTestFn(c: ChainProxy, s: FilteringRule) {
  // returning -1 means the rule is not applicable
  if (s.chainname === undefined && s.model === undefined && s.atomindex === undefined &&
    (s.keyword === undefined || !ChainKeywords.includes(s.keyword) || !c.entity)
  ) return -1

  if (s.keyword !== undefined) {
    if (s.keyword === kwd.POLYMER && !c.entity.isPolymer()) return false
    if (s.keyword === kwd.WATER && !c.entity.isWater()) return false
  }

  if (s.atomindex !== undefined &&
    rangeInSortedArray(s.atomindex, c.atomOffset, c.atomEnd) === 0
  ) return false

  if (s.chainname !== undefined && s.chainname !== c.chainname) return false

  if (s.model !== undefined && s.model !== c.modelIndex) return false

  return true
}

function modelTestFn(m: ModelProxy, s: FilteringRule) {
  // returning -1 means the rule is not applicable
  if (s.model === undefined && s.atomindex === undefined) return -1

  if (s.atomindex !== undefined &&
    rangeInSortedArray(s.atomindex, m.atomOffset, m.atomEnd) === 0
  ) return false

  if (s.model !== undefined && s.model !== m.index) return false

  return true
}

// Catana addition
function cgMonomerTestFn(m: CgMonomerProxy, s: FilteringRule) {
  if (s.resname === undefined && s.chainname === undefined && s.resno === undefined &&
    (s.keyword === undefined || AtomOnlyKeywords.includes(s.keyword))
  ) return -1;

  if (s.keyword !== undefined) {
    if (s.keyword === kwd.PROTEIN && !m.getParentPolymer().isProtein()) return false;
    if (s.keyword === kwd.NUCLEIC && !m.getParentPolymer().isNucleic()) return false;
    if (s.keyword === kwd.RNA && !m.getParentPolymer().isRna()) return false;
    if (s.keyword === kwd.DNA && !m.getParentPolymer().isDna()) return false;

    if (m.getParentPolymer().isNucleic()) {
      const str = m.getParentPolymer() as CgNucleicAcidStrand;
      if (s.keyword === kwd.SCAFFOLD && !str.isScaffold) return false;
      if (s.keyword === kwd.STAPLE && str.isScaffold) return false;
    }
  }

  if (s.resname !== undefined) {
    if (Array.isArray(s.resname)) {
      if (!s.resname.includes(m.residueName)) return false;
    } else {
      if (s.resname !== m.residueName) return false;
    }
  }

  if (s.chainname !== undefined && s.chainname !== m.getParentPolymer().name) return false;

  if (s.resno !== undefined) {
    if (Array.isArray(s.resno) && s.resno.length === 2) {
      if (s.resno[0] > m.residueNumber || s.resno[1] < m.residueNumber) {
        return false;
      }
    } else {
      if (s.resno !== m.residueNumber) {
        return false;
      }
    }
  }

  return true;
}

function makeTest(filter: FilteringRule | null, fn: TestEntityFn) {
  if (filter === null) return false
  if (filter.error) return false
  if (!filter.rules || filter.rules.length === 0) return false

  const n = filter.rules.length

  const t = !filter.negate
  const f = !!filter.negate

  const subTests: FilteringTest[] = []
  for (let i = 0; i < n; ++i) {
    const s = filter.rules[i]
    if (s.hasOwnProperty('operator')) {
      subTests[i] = makeTest(s, fn) as FilteringTest  // TODO
    }
  }

  // ( x and y ) can short circuit on false
  // ( x or y ) can short circuit on true
  // not ( x and y )

  return function test(entity: ProxyEntity) {
    const and = filter.operator === 'AND'
    let na = false

    for (let i = 0; i < n; ++i) {
      const s = filter.rules![i]  // TODO
      let ret

      if (s.hasOwnProperty('operator')) {
        const test = subTests[i]
        if (test !== false) {
          ret = test(entity)
        } else {
          ret = -1
        }

        if (ret === -1) {
          na = true
          continue
        } else if (ret === true) {
          if (and) { continue } else { return t }
        } else {
          if (and) { return f } else { continue }
        }
      } else {
        if (s.keyword === kwd.ALL) {
          if (and) { continue } else { return t }
        } else if (s.keyword === kwd.NONE) {
          if (and) { continue } else { return f }
        }

        ret = fn(entity, s)

        // console.log( entity.qualifiedName(), ret, s, filter.negate, "t", t, "f", f )

        if (ret === -1) {
          na = true
          continue
        } else if (ret === true) {
          if (and) { continue } else { return t }
        } else {
          if (and) { return f } else { continue }
        }
      }
    }

    if (na) {
      return -1
    } else {
      if (and) { return t } else { return f }
    }
  } as FilteringTest
}

function filter(filt: FilteringRule, fn: FilterFn) {
  if (filt.error) return filt
  if (!filt.rules || filt.rules.length === 0) return filt

  const n = filt.rules.length

  const filtered: FilteringRule = {
    operator: filt.operator,
    rules: []
  }
  if (filt.hasOwnProperty('negate')) {
    filtered.negate = filt.negate
  }

  for (let i = 0; i < n; ++i) {
    const s = filt.rules[i]
    if (s.hasOwnProperty('operator')) {
      const fs = filter(s, fn)
      if (fs !== null) filtered.rules!.push(fs)  // TODO
    } else if (!fn(s)) {
      filtered.rules!.push(s)  // TODO
    }
  }

  if (filtered.rules!.length > 0) {  // TODO
    // TODO maybe the filtered rules could be returned
    // in some case, but the way how tests are applied
    // e.g. when traversing a structure would also need
    // to change
    return filt
    // return filtered;
  } else {
    return null
  }
}

function makeAtomTest(filt: FilteringRule, atomOnly = false) {
  let filteredSelection: FilteringRule | null = filt
  if (atomOnly) {
    filteredSelection = filter(filt, function (s) {
      if (s.keyword !== undefined && !AtomOnlyKeywords.includes(s.keyword)) return true
      if (s.model !== undefined) return true
      if (s.chainname !== undefined) return true
      if (s.resname !== undefined) return true
      if (s.resno !== undefined) return true
      if (s.sstruc !== undefined) return true
      return false
    })
  }
  return makeTest(filteredSelection, atomTestFn)
}

function makeResidueTest(filt: FilteringRule, residueOnly = false) {
  let filteredSelection: FilteringRule | null = filt
  if (residueOnly) {
    filteredSelection = filter(filt, function (s) {
      if (s.keyword !== undefined && AtomOnlyKeywords.includes(s.keyword)) return true
      if (s.model !== undefined) return true
      if (s.chainname !== undefined) return true
      if (s.atomname !== undefined) return true
      if (s.element !== undefined) return true
      if (s.altloc !== undefined) return true
      return false
    })
  }
  return makeTest(filteredSelection, residueTestFn)
}

function makeChainTest(filt: FilteringRule, chainOnly = false) {
  let filteredSelection: FilteringRule | null = filt
  if (chainOnly) {
    filteredSelection = filter(filt, function (s) {
      if (s.keyword !== undefined && !ChainKeywords.includes(s.keyword)) return true
      // if( s.model!==undefined ) return true;
      if (s.resname !== undefined) return true
      if (s.resno !== undefined) return true
      if (s.atomname !== undefined) return true
      if (s.element !== undefined) return true
      if (s.altloc !== undefined) return true
      if (s.sstruc !== undefined) return true
      if (s.inscode !== undefined) return true
      return false
    })
  }
  return makeTest(filteredSelection, chainTestFn)
}

function makeModelTest(filt: FilteringRule, modelOnly = false) {
  let filteredSelection: FilteringRule | null = filt
  if (modelOnly) {
    filteredSelection = filter(filt, function (s) {
      if (s.keyword !== undefined) return true
      if (s.chainname !== undefined) return true
      if (s.resname !== undefined) return true
      if (s.resno !== undefined) return true
      if (s.atomname !== undefined) return true
      if (s.element !== undefined) return true
      if (s.altloc !== undefined) return true
      if (s.sstruc !== undefined) return true
      if (s.inscode !== undefined) return true
      return false
    })
  }
  return makeTest(filteredSelection, modelTestFn)
}

// Catana addition
function makeCgMonomerTest(filt: FilteringRule, cgMonomerOnly = false) {
  let filteredSelection: null | FilteringRule = filt;
  if (cgMonomerOnly) {
    filteredSelection = filter(filt, function (s) {
      if (s.keyword !== undefined && AtomOnlyKeywords.includes(s.keyword)) return true;
      if (s.resname !== undefined) return true;
      if (s.chainname !== undefined) return true;
      if (s.resno !== undefined) return true;
      return false;
    });
  }
  return makeTest(filteredSelection, cgMonomerTestFn);
}

export {
  makeAtomTest,
  makeResidueTest,
  makeChainTest,
  makeModelTest,
  makeCgMonomerTest // Catana addition
}
