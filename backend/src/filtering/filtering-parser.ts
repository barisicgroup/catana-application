/**
 * @file Filter Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { FilteringRule, FilteringOperator } from './filtering-test'
import {
  kwd, FilterAllKeyword,
  SmallResname, NucleophilicResname, HydrophobicResname, AromaticResname,
  AmideResname, AcidicResname, BasicResname, ChargedResname,
  PolarResname, NonpolarResname, CyclicResname, AliphaticResname, Keywords, k
} from './filtering-constants'

function parseFilt(string: string) {
  let retFilter: FilteringRule = {
    operator: undefined,
    rules: []
  }

  if (!string) {
    return retFilter
  }

  let filter = retFilter
  let newFilter: FilteringRule
  let oldFilter: FilteringRule
  const filterStack: FilteringRule[] = []

  string = string.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim()
  if (string.charAt(0) === '(' && string.substr(-1) === ')') {
    string = string.slice(1, -1).trim()
  }
  const chunks = string.split(/\s+/)

  // Log.log( string, chunks )

  const createNewContext = (operator?: FilteringOperator) => {
    newFilter = {
      operator,
      rules: []
    }
    if (filter === undefined) {
      filter = newFilter
      retFilter = newFilter
    } else {
      filter.rules!.push(newFilter)
      filterStack.push(filter)
      filter = newFilter
    }
  }

  const getPrevContext = function (operator?: FilteringOperator) {
    oldFilter = filter
    filter = filterStack.pop()!
    if (filter === undefined) {
      createNewContext(operator)
      pushRule(oldFilter)
    }
  }

  const pushRule = function (rule: FilteringRule) {
    filter.rules!.push(rule)
  }

  let not: false | 0 | 1 | 2 = false

  for (let i = 0; i < chunks.length; ++i) {
    const c = chunks[i]
    const cu = c.toUpperCase()

    // handle parens

    if (c === Keywords[k.PAR_L]) {
      // Log.log( "(" );
      not = false
      createNewContext()
      continue
    } else if (c === Keywords[k.PAR_R]) {
      // Log.log( ")" );
      getPrevContext()
      if (filter.negate) {
        getPrevContext()
      }
      continue
    }

    // leave 'not' context

    if (not > 0) {
      if (cu === Keywords[k.NOT]) {
        not = 1
      } else if (not === 1) {
        not = 2
      } else if (not === 2) {
        not = false
        getPrevContext()
      } else {
        throw new Error("something went wrong with 'not'")
      }
    }

    // handle logic operators

    if (cu === Keywords[k.AND]) {
      // Log.log( "AND" );
      if (filter.operator === Keywords[k.OR]) {
        const lastRule = filter.rules!.pop()!
        createNewContext('AND')
        pushRule(lastRule)
      } else {
        filter.operator = 'AND'
      }
      continue
    } else if (cu === Keywords[k.OR]) {
      // Log.log( "OR" );
      if (filter.operator === 'AND') {
        getPrevContext('OR')
      } else {
        filter.operator = 'OR'
      }
      continue
    } else if (c.toUpperCase() === Keywords[k.NOT]) {
      // Log.log( "NOT", j );
      not = 1
      createNewContext()
      filter.negate = true
      continue
    } else {
      // Log.log( "chunk", c, j, filter );
    }

    // handle keyword attributes

    // ensure `cu` is not a number before testing if it is in the
    // kwd enum dictionary which includes the enum numbers as well...
    if (+cu !== +cu) {
      const keyword = (kwd as any)[cu]
      if (keyword !== undefined) {
        pushRule({ keyword })
        continue
      }
    }

    if (cu === Keywords[k.HYDROGEN]) {
      pushRule({
        operator: 'OR',
        rules: [
          { element: 'H' },
          { element: 'D' }
        ]
      })
      continue
    }

    if (cu === Keywords[k.SMALL]) {
      pushRule({ resname: SmallResname })
      continue
    }

    if (cu === Keywords[k.NUCLEOPHILIC]) {
      pushRule({ resname: NucleophilicResname })
      continue
    }

    if (cu === Keywords[k.HYDROPHOBIC]) {
      pushRule({ resname: HydrophobicResname })
      continue
    }

    if (cu === Keywords[k.AROMATIC]) {
      pushRule({ resname: AromaticResname })
      continue
    }

    if (cu === Keywords[k.AMIDE]) {
      pushRule({ resname: AmideResname })
      continue
    }

    if (cu === Keywords[k.ACIDIC]) {
      pushRule({ resname: AcidicResname })
      continue
    }

    if (cu === Keywords[k.BASIC]) {
      pushRule({ resname: BasicResname })
      continue
    }

    if (cu === Keywords[k.CHARGED]) {
      pushRule({ resname: ChargedResname })
      continue
    }

    if (cu === Keywords[k.POLAR]) {
      pushRule({ resname: PolarResname })
      continue
    }

    if (cu === Keywords[k.NONPOLAR]) {
      pushRule({ resname: NonpolarResname })
      continue
    }

    if (cu === Keywords[k.CYCLIC]) {
      pushRule({ resname: CyclicResname })
      continue
    }

    if (cu === Keywords[k.ALIPHATIC]) {
      pushRule({ resname: AliphaticResname })
      continue
    }

    if (cu === Keywords[k.SIDECHAINATTACHED]) {
      pushRule({
        operator: 'OR',
        rules: [
          { keyword: kwd.SIDECHAIN },
          {
            operator: 'AND',
            negate: false,
            rules: [
              { keyword: kwd.PROTEIN },
              {
                operator: 'OR',
                negate: false,
                rules: [
                  { atomname: 'CA' },
                  { atomname: 'BB' }
                ]
              }
            ]
          },
          {
            operator: 'AND',
            negate: false,
            rules: [
              { resname: 'PRO' },
              { atomname: 'N' }
            ]
          },
          {
            operator: 'AND',
            negate: false,
            rules: [
              { keyword: kwd.NUCLEIC },
              {
                operator: 'OR',
                negate: true,
                rules: [
                  { atomname: 'P' },
                  { atomname: 'OP1' },
                  { atomname: 'OP2' },
                  { atomname: "O3'" },
                  { atomname: 'O3*' },
                  { atomname: "HO3'" },
                  { atomname: "O5'" },
                  { atomname: 'O5*' },
                  { atomname: "HO5'" },
                  { atomname: "C5'" },
                  { atomname: 'C5*' },
                  { atomname: "H5'" },
                  { atomname: "H5''" }
                ]
              }
            ]
          }
        ]
      })
      continue
    }

    if (cu === Keywords[k.APOLARH]) {
      pushRule({
        operator: 'AND',
        negate: false,
        rules: [
          { element: 'H' },
          {
            negate: true,
            operator: undefined,
            rules: [
              { keyword: kwd.POLARH }
            ]
          }
        ]
      })
      continue
    }

    if (cu === Keywords[k.LIGAND]) {
      pushRule({
        operator: 'AND',
        rules: [
          {
            operator: 'OR',
            rules: [
              {
                operator: 'AND',
                rules: [
                  { keyword: kwd.HETERO },
                  {
                    negate: true,
                    operator: undefined,
                    rules: [
                      { keyword: kwd.POLYMER }
                    ]
                  }
                ]
              },
              {
                negate: true,
                operator: undefined,
                rules: [
                  { keyword: kwd.POLYMER }
                ]
              }
            ]
          },
          {
            negate: true,
            operator: undefined,
            rules: [
              {
                operator: 'OR',
                rules: [
                  { keyword: kwd.WATER },
                  { keyword: kwd.ION }
                ]
              }
            ]
          }
        ]
      })
      continue
    }

    if (FilterAllKeyword.indexOf(cu) !== -1) {
      pushRule({ keyword: kwd.ALL })
      continue
    }

    // handle atom expressions

    if (c.charAt(0) === Keywords[k.ATOMLIST]) {
      const indexList = c.substr(1).split(Keywords[k.SEPARATOR]).map(x => parseInt(x))
      indexList.sort(function (a, b) { return a - b })
      pushRule({ atomindex: indexList })
      continue
    }

    if (c.charAt(0) === Keywords[k.ATOM_DEPRECATED]) {
      console.error(Keywords[k.ATOM_DEPRECATED] + ' for element filter deprecated, use ' + Keywords[k.ELEMENT])
      pushRule({ element: cu.substr(1) })
      continue
    }
    if (c.charAt(0) === Keywords[k.ELEMENT]) {
      pushRule({ element: cu.substr(1) })
      continue
    }

    if (c[0] === Keywords[k.RESLIST_START] && c[c.length - 1] === Keywords[k.RESLIST_END]) {
      const resnameList = cu.substr(1, c.length - 2).split(Keywords[k.SEPARATOR])
      const resname = resnameList.length > 1 ? resnameList : resnameList[0]
      pushRule({ resname: resname })
      continue
    } else if (
      (c.length >= 1 && c.length <= 4) &&
      c[0] !== '^' && c[0] !== ':' && c[0] !== '.' && c[0] !== '%' && c[0] !== '/' &&
      isNaN(parseInt(c))
    ) {
      pushRule({ resname: cu })
      continue
    }

    // there must be only one constraint per rule
    // otherwise a test quickly becomes not applicable
    // e.g. chainTest for chainname when resno is present too

    const filt: FilteringRule = {
      operator: 'AND',
      rules: []
    }

    const model = c.split(Keywords[k.MODEL])
    if (model.length > 1 && model[1]) {
      if (isNaN(parseInt(model[1]))) {
        throw new Error('model must be an integer')
      }
      filt.rules!.push({
        model: parseInt(model[1])
      })
    }

    const altloc = model[0].split(Keywords[k.ALTLOC])
    if (altloc.length > 1) {
      filt.rules!.push({
        altloc: altloc[1]
      })
    }

    const atomname = altloc[0].split(Keywords[k.ATOMNAME])
    if (atomname.length > 1 && atomname[1]) {
      if (atomname[1].length > 4) {
        throw new Error('atomname must be one to four characters')
      }
      filt.rules!.push({
        atomname: atomname[1].substring(0, 4).toUpperCase()
      })
    }

    const chain = atomname[0].split(Keywords[k.CHAIN])
    if (chain.length > 1 && chain[1]) {
      filt.rules!.push({
        chainname: chain[1]
      })
    }

    const inscode = chain[0].split(Keywords[k.INSCODE])
    if (inscode.length > 1) {
      filt.rules!.push({
        inscode: inscode[1]
      })
    }

    if (inscode[0]) {
      let negate, negate2
      if (inscode[0][0] === Keywords[k.INSCODE_NEGATE]) {
        inscode[0] = inscode[0].substr(1)
        negate = true
      }
      if (inscode[0].includes(Keywords[k.INSCODE_NEGATE2])) {
        inscode[0] = inscode[0].replace(Keywords[k.INSCODE_NEGATE2], Keywords[k.INSCODE_NEGATE])
        negate2 = true
      }
      let resi = inscode[0].split(Keywords[k.INSCODE_NEGATE])
      if (resi.length === 1) {
        let resiSingle = parseInt(resi[0])
        if (isNaN(resiSingle)) {
          throw new Error('resi must be an integer')
        }
        if (negate) resiSingle *= -1
        filt.rules!.push({
          resno: resiSingle
        })
      } else if (resi.length === 2) {
        const resiRange = resi.map(x => parseInt(x))
        if (negate) resiRange[0] *= -1
        if (negate2) resiRange[1] *= -1
        filt.rules!.push({
          resno: [resiRange[0], resiRange[1]]
        })
      } else {
        throw new Error("resi range must contain one " + Keywords[k.INSCODE_NEGATE])
      }
    }

    // round up

    if (filt.rules!.length === 1) {
      pushRule(filt.rules![0])
    } else if (filt.rules!.length > 1) {
      pushRule(filt)
    } else {
      throw new Error('empty filter chunk')
    }
  }

  // cleanup

  if (
    retFilter.operator === undefined &&
    retFilter.rules!.length === 1 &&
    retFilter.rules![0].hasOwnProperty('operator')
  ) {
    retFilter = retFilter.rules![0]
  }

  return retFilter
}

export {
  parseFilt
}
