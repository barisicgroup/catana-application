/**
 * @file Structure Utils
 * @author Alexander Rose <alexander.rose@weirdbyte.de>, modified by Catana development team
 * @private
 */

import { Vector3, Matrix4, Quaternion, MathUtils } from 'three'

import { Debug, Log } from '../globals'
import { binarySearchIndexOf } from '../utils'
import Helixbundle from '../geometry/helixbundle'
import Kdtree from '../geometry/kdtree'
import { getSymmetryOperations } from '../symmetry/symmetry-utils'
import Assembly from '../symmetry/assembly'
import Structure from '../structure/structure'
import StructureBuilder from '../structure/structure-builder'
import Polymer from '../proxy/polymer'
import ResidueProxy from '../proxy/residue-proxy'

import { UnknownBackboneType, AA3, Bases } from './structure-constants'
import Entity from './entity'
import ChainProxy from '../proxy/chain-proxy'
import AtomProxy from '../proxy/atom-proxy'
import AtomStore from '../store/atom-store'
import ResidueStore from '../store/residue-store'
import ChainStore from '../store/chain-store'
import BitArray_Legacy from '../utils/bitarray'
import Filter from '../filtering/filter'

export function reorderAtoms(structure: Structure) {
  if (Debug) Log.time('reorderAtoms')

  var ap1 = structure.getAtomProxy()
  var ap2 = structure.getAtomProxy()

  function compareModelChainResno(index1: number, index2: number) {
    ap1.index = index1
    ap2.index = index2
    if (ap1.modelIndex < ap2.modelIndex) {
      return -1
    } else if (ap1.modelIndex > ap2.modelIndex) {
      return 1
    } else {
      if (ap1.chainname < ap2.chainname) {
        return -1
      } else if (ap1.chainname > ap2.chainname) {
        return 1
      } else {
        if (ap1.resno < ap2.resno) {
          return -1
        } else if (ap1.resno > ap2.resno) {
          return 1
        } else {
          return 0
        }
      }
    }
  }

  structure.atomStore.sort(compareModelChainResno)

  if (Debug) Log.timeEnd('reorderAtoms')
}

export interface SecStruct {
  helices: [string, number, string, string, number, string, number][]
  sheets: [string, number, string, string, number, string][]
}

export function assignSecondaryStructure(structure: Structure, secStruct: SecStruct) {
  if (!secStruct) return

  if (Debug) Log.time('assignSecondaryStructure')

  const chainnames: string[] = []
  structure.eachModel(function (mp) {
    mp.eachChain(function (cp) {
      chainnames.push(cp.chainname)
    })
  })

  const chainnamesSorted = chainnames.slice().sort()
  const chainnamesIndex: number[] = []
  chainnamesSorted.forEach(function (c) {
    chainnamesIndex.push(chainnames.indexOf(c))
  })

  // helix assignment

  const helices = secStruct.helices.filter(function (h) {
    return binarySearchIndexOf(chainnamesSorted, h[0]) >= 0
  })

  helices.sort(function (h1, h2) {
    const c1 = h1[0]
    const c2 = h2[0]
    const r1 = h1[1]
    const r2 = h2[1]

    if (c1 === c2) {
      if (r1 === r2) {
        return 0
      } else {
        return r1 < r2 ? -1 : 1
      }
    } else {
      const idx1 = binarySearchIndexOf(chainnamesSorted, c1)
      const idx2 = binarySearchIndexOf(chainnamesSorted, c2)
      return chainnamesIndex[idx1] < chainnamesIndex[idx2] ? -1 : 1
    }
  })

  const residueStore = structure.residueStore

  structure.eachModel(function (mp) {
    let i = 0
    const n = helices.length
    if (n === 0) return
    let helix = helices[i]
    let helixRun = false
    let done = false

    mp.eachChain(function (cp) {
      let chainChange = false

      if (cp.chainname === helix[0]) {
        const count = cp.residueCount
        const offset = cp.residueOffset
        const end = offset + count

        for (let j = offset; j < end; ++j) {
          if (residueStore.resno[j] === helix[1] &&  // resnoBeg
            residueStore.getInscode(j) === helix[2]   // inscodeBeg
          ) {
            helixRun = true
          }

          if (helixRun) {
            residueStore.sstruc[j] = helix[6]

            if (residueStore.resno[j] === helix[4] &&  // resnoEnd
              residueStore.getInscode(j) === helix[5]   // inscodeEnd
            ) {
              helixRun = false
              i += 1

              if (i < n) {
                // must look at previous residues as
                // residues may not be ordered by resno
                j = offset - 1
                helix = helices[i]
                chainChange = cp.chainname !== helix[0]
              } else {
                done = true
              }
            }
          }

          if (chainChange || done) return
        }
      }
    })
  })

  // sheet assignment

  const sheets = secStruct.sheets.filter(function (s) {
    return binarySearchIndexOf(chainnamesSorted, s[0]) >= 0
  })

  sheets.sort(function (s1, s2) {
    const c1 = s1[0]
    const c2 = s2[0]

    if (c1 === c2) return 0
    const idx1 = binarySearchIndexOf(chainnamesSorted, c1)
    const idx2 = binarySearchIndexOf(chainnamesSorted, c2)
    return chainnamesIndex[idx1] < chainnamesIndex[idx2] ? -1 : 1
  })

  const strandCharCode = 'e'.charCodeAt(0)
  structure.eachModel(function (mp) {
    let i = 0
    const n = sheets.length
    if (n === 0) return
    let sheet = sheets[i]
    let sheetRun = false
    let done = false

    mp.eachChain(function (cp) {
      let chainChange = false

      if (cp.chainname === sheet[0]) {
        const count = cp.residueCount
        const offset = cp.residueOffset
        const end = offset + count

        for (let j = offset; j < end; ++j) {
          if (residueStore.resno[j] === sheet[1] &&  // resnoBeg
            residueStore.getInscode(j) === sheet[2]   // inscodeBeg
          ) {
            sheetRun = true
          }

          if (sheetRun) {
            residueStore.sstruc[j] = strandCharCode

            if (residueStore.resno[j] === sheet[4] &&  // resnoEnd
              residueStore.getInscode(j) === sheet[5]   // inscodeEnd
            ) {
              sheetRun = false
              i += 1

              if (i < n) {
                // must look at previous residues as
                // residues may not be ordered by resno
                j = offset - 1
                sheet = sheets[i]
                chainChange = cp.chainname !== sheet[0]
              } else {
                done = true
              }
            }
          }

          if (chainChange || done) return
        }
      }
    })
  })

  if (Debug) Log.timeEnd('assignSecondaryStructure')
}

export const calculateSecondaryStructure = (function () {
  // Implementation for proteins based on "pv"
  //
  // assigns secondary structure information based on a simple and very fast
  // algorithm published by Zhang and Skolnick in their TM-align paper.
  // Reference:
  //
  // TM-align: a protein structure alignment algorithm based on the Tm-score
  // (2005) NAR, 33(7) 2302-2309

  const zhangSkolnickSS = function (polymer: Polymer, i: number, distances: number[], delta: number) {
    const structure = polymer.structure
    const offset = polymer.residueIndexStart
    const rp1 = structure.getResidueProxy()
    const rp2 = structure.getResidueProxy()
    const ap1 = structure.getAtomProxy()
    const ap2 = structure.getAtomProxy()

    for (let j = Math.max(0, i - 2); j <= i; ++j) {
      for (let k = 2; k < 5; ++k) {
        if (j + k >= polymer.residueCount) {
          continue
        }

        rp1.index = offset + j
        rp2.index = offset + j + k
        ap1.index = rp1.traceAtomIndex
        ap2.index = rp2.traceAtomIndex

        const d = ap1.distanceTo(ap2)

        if (Math.abs(d - distances[k - 2]) > delta) {
          return false
        }
      }
    }

    return true
  }

  const isHelical = function (polymer: Polymer, i: number) {
    const helixDistances = [5.45, 5.18, 6.37]
    const helixDelta = 2.1
    return zhangSkolnickSS(polymer, i, helixDistances, helixDelta)
  }

  const isSheet = function (polymer: Polymer, i: number) {
    const sheetDistances = [6.1, 10.4, 13.0]
    const sheetDelta = 1.42
    return zhangSkolnickSS(polymer, i, sheetDistances, sheetDelta)
  }

  const proteinPolymer = function (p: Polymer) {
    const residueStore = p.residueStore
    const offset = p.residueIndexStart
    for (let i = 0, il = p.residueCount; i < il; ++i) {
      let sstruc = 'c'
      if (isHelical(p, i)) {
        sstruc = 'h'
      } else if (isSheet(p, i)) {
        sstruc = 'e'
      }
      residueStore.sstruc[offset + i] = sstruc.charCodeAt(0)
    }
  }

  const cgPolymer = function (p: Polymer) {
    const localAngle = 20
    const centerDist = 2.0

    const residueStore = p.residueStore
    const offset = p.residueIndexStart

    const helixbundle = new Helixbundle(p)
    const pos = helixbundle.position

    const c1 = new Vector3()
    const c2 = new Vector3()

    for (let i = 0, il = p.residueCount; i < il; ++i) {
      c1.fromArray(pos.center as any, i * 3)  // TODO
      c2.fromArray(pos.center as any, i * 3 + 3)  // TODO
      const d = c1.distanceTo(c2)

      if (d < centerDist && d > 1.0 && pos.bending[i] < localAngle) {
        residueStore.sstruc[offset + i] = 'h'.charCodeAt(0)
        residueStore.sstruc[offset + i + 1] = 'h'.charCodeAt(0)
      }
    }
  }

  return function calculateSecondaryStructure(structure: Structure) {
    if (Debug) Log.time('calculateSecondaryStructure')

    structure.eachPolymer(function (p) {
      // assign secondary structure
      //if (p.residueCount < 4) return
      if (p.isCg()) {
        cgPolymer(p)
      } else if (p.isProtein()) {
        proteinPolymer(p)
      } else {
        return
      }

      // set lone secondary structure assignments to "c"
      let prevSstruc: string
      let sstrucCount = 0
      p.eachResidue(function (r: ResidueProxy) {
        if (r.sstruc === prevSstruc) {
          sstrucCount += 1
        } else {
          if (sstrucCount === 1) {
            r.index -= 1
            r.sstruc = 'c'
          }
          sstrucCount = 1
          prevSstruc = r.sstruc
        }
      })
    })

    if (Debug) Log.timeEnd('calculateSecondaryStructure')
  }
}())

// const ChainnameAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
//                           "abcdefghijklmnopqrstuvwxyz" +
//                           "0123456789";
export const ChainnameAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function getChainname(index: number) {
  const n = ChainnameAlphabet.length
  let j = index
  let k = 0
  let chainname = ChainnameAlphabet[j % n]
  while (j >= n) {
    j = Math.floor(j / n)
    chainname += ChainnameAlphabet[j % n]
    k += 1
  }
  if (k >= 5) {
    Log.warn('chainname overflow')
  }
  return chainname
}

interface ChainData {
  mIndex: number
  chainname: string
  rStart: number
  rCount: number
}

export function calculateChainnames(structure: Structure, useExistingBonds = false) {
  if (Debug) Log.time('calculateChainnames')

  let doAutoChainName = true
  structure.eachChain(function (c) {
    if (c.chainname) doAutoChainName = false
  })

  if (doAutoChainName) {
    const modelStore = structure.modelStore
    const chainStore = structure.chainStore
    const residueStore = structure.residueStore

    const addChain = function (mIndex: number, chainname: string, rOffset: number, rCount: number) {
      const ci = chainStore.count
      for (let i = 0; i < rCount; ++i) {
        residueStore.chainIndex[rOffset + i] = ci
      }
      chainStore.growIfFull()
      chainStore.modelIndex[ci] = mIndex
      chainStore.setChainname(ci, chainname)
      chainStore.setChainid(ci, chainname)
      chainStore.residueOffset[ci] = rOffset
      chainStore.residueCount[ci] = rCount
      chainStore.count += 1
      modelStore.chainCount[mIndex] += 1
    }

    const ap1 = structure.getAtomProxy()
    const ap2 = structure.getAtomProxy()

    let i = 0
    let mi = 0
    let rStart = 0
    let rEnd = 0
    const chainData: ChainData[] = []

    if (residueStore.count === 1) {
      chainData.push({
        mIndex: 0,
        chainname: 'A',
        rStart: 0,
        rCount: 1
      })
    } else {
      structure.eachResidueN(2, function (rp1: ResidueProxy, rp2: ResidueProxy) {
        let newChain = false

        const bbType1 = rp1.backboneType
        const bbType2 = rp2.backboneType
        const bbTypeUnk = UnknownBackboneType

        rEnd = rp1.index

        if (rp1.modelIndex !== rp2.modelIndex) {
          newChain = true
        } else if (rp1.moleculeType !== rp2.moleculeType) {
          newChain = true
        } else if (bbType1 !== bbTypeUnk && bbType1 === bbType2) {
          ap1.index = rp1.backboneEndAtomIndex
          ap2.index = rp2.backboneStartAtomIndex
          if (useExistingBonds) {
            newChain = !ap1.hasBondTo(ap2)
          } else {
            newChain = !ap1.connectedTo(ap2)
          }
        }

        // current chain goes to end of the structure
        if (!newChain && rp2.index === residueStore.count - 1) {
          newChain = true
          rEnd = rp2.index
        }

        if (newChain) {
          chainData.push({
            mIndex: mi,
            chainname: getChainname(i),
            rStart: rStart,
            rCount: rEnd - rStart + 1
          })

          i += 1

          if (rp1.modelIndex !== rp2.modelIndex) {
            i = 0
            mi += 1
          }

          // new chain for the last residue of the structure
          if (rp2.index === residueStore.count - 1 && rEnd !== rp2.index) {
            chainData.push({
              mIndex: mi,
              chainname: getChainname(i),
              rStart: residueStore.count - 1,
              rCount: 1
            })
          }

          rStart = rp2.index
          rEnd = rp2.index
        }
      })
    }

    //

    chainStore.count = 0
    chainData.forEach(function (d) {
      addChain(d.mIndex, d.chainname, d.rStart, d.rCount)
    })

    let chainOffset = 0
    structure.eachModel(function (mp) {
      modelStore.chainOffset[mp.index] = chainOffset
      modelStore.chainCount[mp.index] -= 1
      chainOffset += modelStore.chainCount[mp.index]
    })
  }

  if (Debug) Log.timeEnd('calculateChainnames')
}

export function calculateBonds(structure: Structure) {
  if (Debug) Log.time('calculateBonds')

  calculateBondsWithin(structure)
  calculateBondsBetween(structure)

  if (Debug) Log.timeEnd('calculateBonds')
}

export interface ResidueBonds {
  atomIndices1: number[]
  atomIndices2: number[]
  bondOrders: number[]
}


const BondOrderTable: { [k: string]: number } = {
  'HIS|CD2|CG': 2,
  'HIS|CE1|ND1': 2,
  'ARG|CZ|NH2': 2,
  'PHE|CE1|CZ': 2,
  'PHE|CD2|CE2': 2,
  'PHE|CD1|CG': 2,
  'TRP|CD1|CG': 2,
  'TRP|CD2|CE2': 2,
  'TRP|CE3|CZ3': 2,
  'TRP|CH2|CZ2': 2,
  'ASN|CG|OD1': 2,
  'GLN|CD|OE1': 2,
  'TYR|CD1|CG': 2,
  'TYR|CD2|CE2': 2,
  'TYR|CE1|CZ': 2,
  'ASP|CG|OD1': 2,
  'GLU|CD|OE1': 2,

  'G|C8|N7': 2,
  'G|C4|C5': 2,
  'G|C2|N3': 2,
  'G|C6|O6': 2,
  'C|C4|N3': 2,
  'C|C5|C6': 2,
  'C|C2|O2': 2,
  'A|C2|N3': 2,
  'A|C6|N1': 2,
  'A|C4|C5': 2,
  'A|C8|N7': 2,
  'U|C5|C6': 2,
  'U|C2|O2': 2,
  'U|C4|O4': 2,

  'DG|C8|N7': 2,
  'DG|C4|C5': 2,
  'DG|C2|N3': 2,
  'DG|C6|O6': 2,
  'DC|C4|N3': 2,
  'DC|C5|C6': 2,
  'DC|C2|O2': 2,
  'DA|C2|N3': 2,
  'DA|C6|N1': 2,
  'DA|C4|C5': 2,
  'DA|C8|N7': 2,
  'DT|C5|C6': 2,
  'DT|C2|O2': 2,
  'DT|C4|O4': 2
}
function getBondOrderFromTable(resname: string, atomname1: string, atomname2: string) {
  [atomname1, atomname2] = atomname1 < atomname2 ? [atomname1, atomname2] : [atomname2, atomname1]
  if (AA3.includes(resname) && atomname1 === 'C' && atomname2 === 'O') return 2
  if (Bases.includes(resname) && atomname1 === 'OP1' && atomname2 === 'P') return 2
  return BondOrderTable[`${resname}|${atomname1}|${atomname2}`] || 1
}

export function calculateResidueBonds(r: ResidueProxy) {
  const structure = r.structure
  const a1 = structure.getAtomProxy()
  const a2 = structure.getAtomProxy()

  const count = r.atomCount
  const offset = r.atomOffset
  const end = offset + count
  const end1 = end - 1

  const atomIndices1 = []
  const atomIndices2 = []
  const bondOrders = []

  if (count > 500) {
    if (Debug) Log.warn('more than 500 atoms, skip residue for auto-bonding', r.qualifiedName())
  } else {
    if (count > 50) {
      const kdtree = new Kdtree(r, true)
      const radius = r.isCg() ? 1.2 : 2.3

      for (let i = offset; i < end1; ++i) {
        a1.index = i
        const maxd = a1.covalent + radius + 0.3
        const nearestAtoms = kdtree.nearest(a1 as any, Infinity, maxd * maxd)  // TODO
        const m = nearestAtoms.length
        for (let j = 0; j < m; ++j) {
          a2.index = nearestAtoms[j].index
          if (a1.index < a2.index) {
            if (a1.connectedTo(a2)) {
              atomIndices1.push(a1.index - offset)
              atomIndices2.push(a2.index - offset)
              bondOrders.push(getBondOrderFromTable(a1.resname, a1.atomname, a2.atomname))
            }
          }
        }
      }
    } else {
      for (let i = offset; i < end1; ++i) {
        a1.index = i
        for (let j = i + 1; j <= end1; ++j) {
          a2.index = j
          if (a1.connectedTo(a2)) {
            atomIndices1.push(i - offset)
            atomIndices2.push(j - offset)
            bondOrders.push(getBondOrderFromTable(a1.resname, a1.atomname, a2.atomname))
          }
        }
      }
    }
  }

  return {
    atomIndices1: atomIndices1,
    atomIndices2: atomIndices2,
    bondOrders: bondOrders
  }
}

export function calculateAtomBondMap(structure: Structure) {
  if (Debug) Log.time('calculateAtomBondMap')

  var atomBondMap: number[][] = []

  structure.eachBond(function (bp) {
    var ai1 = bp.atomIndex1
    var ai2 = bp.atomIndex2
    if (atomBondMap[ai1] === undefined) atomBondMap[ai1] = []
    atomBondMap[ai1][ai2] = bp.index
  })

  if (Debug) Log.timeEnd('calculateAtomBondMap')

  return atomBondMap
}

export function calculateBondsWithin(structure: Structure, onlyAddRung = false) {
  if (Debug) Log.time('calculateBondsWithin')

  const bondStore = structure.bondStore
  const rungBondStore = structure.rungBondStore
  const rungAtomSet = structure.getAtomSet(false)
  const a1 = structure.getAtomProxy()
  const a2 = structure.getAtomProxy()
  const bp = structure.getBondProxy()
  const atomBondMap = onlyAddRung ? null : calculateAtomBondMap(structure)

  structure.eachResidue(function (r) {
    if (!onlyAddRung && atomBondMap) {
      const count = r.atomCount
      const offset = r.atomOffset

      if (count > 500) {
        Log.warn('more than 500 atoms, skip residue for auto-bonding', r.qualifiedName())
        return
      }

      const bonds = r.getBonds()
      const atomIndices1 = bonds.atomIndices1
      const atomIndices2 = bonds.atomIndices2
      const bondOrders = bonds.bondOrders
      const nn = atomIndices1.length

      for (let i = 0; i < nn; ++i) {
        const rai1 = atomIndices1[i]
        const rai2 = atomIndices2[i]
        const ai1 = rai1 + offset
        const ai2 = rai2 + offset
        const tmp = atomBondMap[ai1]
        if (tmp !== undefined && tmp[ai2] !== undefined) {
          bp.index = tmp[ai2]
          const residueTypeBondIndex = r.residueType.getBondIndex(rai1, rai2)!  // TODO
          // overwrite residueType bondOrder with value from existing bond
          bondOrders[residueTypeBondIndex] = bp.bondOrder
        } else {
          a1.index = ai1
          a2.index = ai2
          // only add bond if not already in bondStore
          bondStore.addBond(a1, a2, bondOrders[i])
        }
      }
    }

    // get RNA/DNA rung pseudo bonds
    const traceAtomIndex = r.residueType.traceAtomIndex
    const rungEndAtomIndex = r.residueType.rungEndAtomIndex
    if (traceAtomIndex !== -1 && rungEndAtomIndex !== -1) {
      a1.index = r.traceAtomIndex
      a2.index = r.rungEndAtomIndex
      rungBondStore.addBond(a1, a2)
      rungAtomSet.set(a1.index)
      rungAtomSet.set(a2.index)
    }
  })

  structure.atomSetDict.rung = rungAtomSet

  if (Debug) Log.timeEnd('calculateBondsWithin')
}

export function calculateBondsBetween(structure: Structure, onlyAddBackbone = false, useExistingBonds = false) {
  if (Debug) Log.time('calculateBondsBetween')

  const bondStore = structure.bondStore
  const backboneBondStore = structure.backboneBondStore
  const backboneAtomSet = structure.getAtomSet(false)
  const ap1 = structure.getAtomProxy()
  const ap2 = structure.getAtomProxy()

  // Catana modification:
  // Number of inter-residue bonds calculated per atom is currently limited to eight
  // (already being quite generous limit) to avoid cases where exceedingly high number of
  // bonds was generated (e.g., CIF structures from AlphaFill had this issue).
  const bondsLimit = 8;
  const bondCounts = new Map<number, number>();
  let tooManyBondsFound = false;

  const updateCounts = (ap1idx: number, ap2idx: number) => {
    const ap1Curr = bondCounts.get(ap1idx);
    const ap2Curr = bondCounts.get(ap2idx);
    bondCounts.set(ap1idx, (ap1Curr ?? 0) + 1);
    bondCounts.set(ap2idx, (ap2Curr ?? 0) + 1);
  }

  const bondCountsWithinLimit = (ap1idx: number, ap2idx: number) => {
    const ap1Curr = bondCounts.get(ap1idx);
    const ap2Curr = bondCounts.get(ap2idx);
    const result = (ap1Curr === undefined || ap1Curr < bondsLimit) &&
      (ap2Curr === undefined || ap2Curr < bondsLimit);

    if (!result) {
      tooManyBondsFound = true;
    }

    return result;
  }

  if (backboneBondStore.count === 0) {
    backboneBondStore.resize(structure.residueStore.count)
  }

  function addBondIfConnected(rp1: ResidueProxy, rp2: ResidueProxy) {
    const bbType1 = rp1.backboneType
    const bbType2 = rp2.backboneType
    if (bbType1 !== UnknownBackboneType && bbType1 === bbType2) {
      ap1.index = rp1.backboneEndAtomIndex
      ap2.index = rp2.backboneStartAtomIndex
      if ((useExistingBonds && ap1.hasBondTo(ap2)) || ap1.connectedTo(ap2)) {
        if (!onlyAddBackbone) {
          if (bondCountsWithinLimit(ap1.index, ap2.index)) {
            bondStore.addBond(ap1, ap2, 1)  // assume single bond
            updateCounts(ap1.index, ap2.index);
          }
        }
        ap1.index = rp1.traceAtomIndex
        ap2.index = rp2.traceAtomIndex
        if (bondCountsWithinLimit(ap1.index, ap2.index)) {
          backboneBondStore.addBond(ap1, ap2)
          updateCounts(ap1.index, ap2.index);
        }
        backboneAtomSet.set(ap1.index)
        backboneAtomSet.set(ap2.index)
      }
    }
  }

  structure.eachResidueN(2, addBondIfConnected)

  const rp1 = structure.getResidueProxy()
  const rp2 = structure.getResidueProxy()

  // check for cyclic chains
  structure.eachChain(function (cp) {
    if (cp.residueCount === 0) return
    rp1.index = cp.residueOffset
    rp2.index = cp.residueOffset + cp.residueCount - 1
    addBondIfConnected(rp2, rp1)
  })

  structure.atomSetDict.backbone = backboneAtomSet

  if (!onlyAddBackbone) {
    if (Debug) Log.time('calculateBondsBetween inter')
    const spatialHash = structure.spatialHash
    structure.eachResidue(function (rp) {
      if (rp.backboneType === UnknownBackboneType && !rp.isWater()) {
        rp.eachAtom(function (ap) {
          if (ap.isMetal()) return
          spatialHash!.eachWithin(ap.x, ap.y, ap.z, 4, function (idx) {  // TODO
            ap2.index = idx
            if (ap.modelIndex === ap2.modelIndex &&
              ap.residueIndex !== ap2.residueIndex &&
              !ap2.isMetal()
            ) {
              if (bondCountsWithinLimit(ap.index, ap2.index)) {
                bondStore.addBondIfConnected(ap, ap2, 1)  // assume single bond
                updateCounts(ap.index, ap2.index);
              }
            }
          })
        })
      }
    })
    if (Debug) Log.timeEnd('calculateBondsBetween inter')
  }

  if (Debug) Log.timeEnd('calculateBondsBetween')

  if (tooManyBondsFound) {
    console.log("Atom with more than " + bondsLimit +
      " bonds found. Other bonds for this atom won't be generated.");
  }
}

export function buildUnitcellAssembly(structure: Structure) {
  if (!structure.unitcell) return

  if (Debug) Log.time('buildUnitcellAssembly')

  const uc = structure.unitcell

  const structureCenterFrac = structure.center.clone().applyMatrix4(uc.cartToFrac)
  const centerFrac = structureCenterFrac.clone().floor()
  const symopDict: { [K: string]: Matrix4 } = getSymmetryOperations(uc.spacegroup)

  const centerFracSymop = new Vector3()
  const positionFracSymop = new Vector3()

  function getMatrixList(shift?: Vector3) {
    const matrixList: Matrix4[] = []

    Object.keys(symopDict).forEach(function (name) {
      const m = symopDict[name].clone()

      centerFracSymop.copy(structureCenterFrac).applyMatrix4(m).floor()
      positionFracSymop.setFromMatrixPosition(m)
      positionFracSymop.sub(centerFracSymop)
      positionFracSymop.add(centerFrac)

      if (shift) positionFracSymop.add(shift)

      m.setPosition(positionFracSymop)
      m.multiplyMatrices(uc.fracToCart, m)
      m.multiply(uc.cartToFrac)

      matrixList.push(m)
    })

    return matrixList
  }

  const unitcellAssembly = new Assembly('UNITCELL')
  const unitcellMatrixList = getMatrixList()
  const ncsMatrixList: Matrix4[] = []
  if (structure.biomolDict.NCS) {
    ncsMatrixList.push(
      new Matrix4(), ...structure.biomolDict.NCS.partList[0].matrixList
    )
    const ncsUnitcellMatrixList: Matrix4[] = []
    unitcellMatrixList.forEach(sm => {
      ncsMatrixList.forEach(nm => {
        ncsUnitcellMatrixList.push(sm.clone().multiply(nm))
      })
    })
    unitcellAssembly.addPart(ncsUnitcellMatrixList)
  } else {
    unitcellAssembly.addPart(unitcellMatrixList)
  }

  const vec = new Vector3()
  const supercellAssembly = new Assembly('SUPERCELL')
  const supercellMatrixList = Array.prototype.concat.call(
    getMatrixList(vec.set(1, 0, 0)),  // 655
    getMatrixList(vec.set(0, 1, 0)),  // 565
    getMatrixList(vec.set(0, 0, 1)),  // 556

    getMatrixList(vec.set(-1, 0, 0)),  // 455
    getMatrixList(vec.set(0, -1, 0)),  // 545
    getMatrixList(vec.set(0, 0, -1)),  // 554

    getMatrixList(vec.set(1, 1, 0)),  // 665
    getMatrixList(vec.set(1, 0, 1)),  // 656
    getMatrixList(vec.set(0, 1, 1)),  // 566

    getMatrixList(vec.set(-1, -1, 0)),  // 445
    getMatrixList(vec.set(-1, 0, -1)),  // 454
    getMatrixList(vec.set(0, -1, -1)),  // 544

    getMatrixList(vec.set(1, -1, -1)),  // 644
    getMatrixList(vec.set(1, 1, -1)),  // 664
    getMatrixList(vec.set(1, -1, 1)),  // 646
    getMatrixList(vec.set(-1, 1, 1)),  // 466
    getMatrixList(vec.set(-1, -1, 1)),  // 446
    getMatrixList(vec.set(-1, 1, -1)),  // 464

    getMatrixList(vec.set(0, 1, -1)),  // 564
    getMatrixList(vec.set(0, -1, 1)),  // 546
    getMatrixList(vec.set(1, 0, -1)),  // 654
    getMatrixList(vec.set(-1, 0, 1)),  // 456
    getMatrixList(vec.set(1, -1, 0)),  // 645
    getMatrixList(vec.set(-1, 1, 0)),  // 465

    getMatrixList(),  // 555
    getMatrixList(vec.set(1, 1, 1)),  // 666
    getMatrixList(vec.set(-1, -1, -1))   // 444
  )
  if (structure.biomolDict.NCS) {
    const ncsSupercellMatrixList: Matrix4[] = []
    supercellMatrixList.forEach(function (sm: Matrix4) {
      ncsMatrixList.forEach(function (nm) {
        ncsSupercellMatrixList.push(sm.clone().multiply(nm))
      })
    })
    supercellAssembly.addPart(ncsSupercellMatrixList)
  } else {
    supercellAssembly.addPart(supercellMatrixList)
  }

  structure.biomolDict.UNITCELL = unitcellAssembly
  structure.biomolDict.SUPERCELL = supercellAssembly

  if (Debug) Log.timeEnd('buildUnitcellAssembly')
}

const elm1 = ['H', 'C', 'O', 'N', 'S', 'P']
const elm2 = ['NA', 'CL', 'FE']

export function guessElement(atomName: string) {
  let at = atomName.trim().toUpperCase()
  // parseInt('C') -> NaN; (NaN > -1) -> false
  if (parseInt(at.charAt(0)) > -1) at = at.substr(1)
  // parse again to check for a second integer
  if (parseInt(at.charAt(0)) > -1) at = at.substr(1)
  const n = at.length

  if (n === 0) return ''
  if (n === 1) return at
  if (n === 2) {
    if (elm2.indexOf(at) !== -1) return at
    if (elm1.indexOf(at[0]) !== -1) return at[0]
  }
  if (n >= 3) {
    if (elm1.indexOf(at[0]) !== -1) return at[0]
  }
  return ''
}

/**
 * Assigns ResidueType bonds.
 * @param {Structure} structure - the structure object
 * @return {undefined}
 */
export function assignResidueTypeBonds(structure: Structure) {
  // if( Debug ) Log.time( "assignResidueTypeBonds" )

  const bondHash = structure.bondHash!  // TODO
  const countArray = bondHash.countArray
  const offsetArray = bondHash.offsetArray
  const indexArray = bondHash.indexArray
  const bp = structure.getBondProxy()

  structure.eachResidue(function (rp) {
    const residueType = rp.residueType
    if (residueType.bonds !== undefined) return

    var atomOffset = rp.atomOffset
    var atomIndices1: number[] = []
    var atomIndices2: number[] = []
    var bondOrders: number[] = []
    var bondDict: { [k: string]: boolean } = {}

    const nextAtomOffset = atomOffset + rp.atomCount

    rp.eachAtom(function (ap) {
      const index = ap.index
      const offset = offsetArray[index]
      const count = countArray[index]
      for (let i = 0, il = count; i < il; ++i) {
        bp.index = indexArray[offset + i]
        let idx1 = bp.atomIndex1
        if (idx1 < atomOffset || idx1 >= nextAtomOffset) {
          // Don't add bonds outside of this resiude
          continue
        }
        let idx2 = bp.atomIndex2
        if (idx2 < atomOffset || idx2 >= nextAtomOffset) {
          continue
        }

        if (idx1 > idx2) {
          const tmp = idx2
          idx2 = idx1
          idx1 = tmp
        }
        const hash = idx1 + '|' + idx2
        if (bondDict[hash] === undefined) {
          bondDict[hash] = true
          atomIndices1.push(idx1 - atomOffset)
          atomIndices2.push(idx2 - atomOffset)
          bondOrders.push(bp.bondOrder)
        }
      }
    })

    residueType.bonds = {
      atomIndices1: atomIndices1,
      atomIndices2: atomIndices2,
      bondOrders: bondOrders
    }
  })

  // if( Debug ) Log.timeEnd( "assignResidueTypeBonds" )
}

/**
 * Merges given structures into a new structure
 */
export function concatStructures(name: string, ...structures: Structure[]) {
  if (Debug) Log.time("concatStructures")

  const s = new Structure(name, '')
  const sb = new StructureBuilder(s)

  const atomStore = s.atomStore as any
  const atomMap = s.atomMap
  atomStore.addField('formalCharge', 1, 'int8')
  atomStore.addField('partialCharge', 1, 'float32')

  const atomIndexDict: { [k: number]: number } = {}

  let idx = 0
  let atomCount = 0
  let modelCount = 0
  structures.forEach(structure => {
    structure.eachAtom(a => {
      atomStore.growIfFull()
      atomStore.atomTypeId[idx] = atomMap.add(a.atomname, a.element)

      atomStore.x[idx] = a.x
      atomStore.y[idx] = a.y
      atomStore.z[idx] = a.z
      atomStore.serial[idx] = a.serial
      atomStore.formalCharge[idx] = a.formalCharge
      atomStore.partialCharge[idx] = a.partialCharge
      atomStore.altloc[idx] = a.altloc
      atomStore.occupancy[idx] = a.occupancy
      atomStore.bfactor[idx] = a.bfactor

      sb.addAtom(
        a.modelIndex + modelCount,
        a.chainname,
        a.chainid,
        a.resname,
        a.resno,
        a.hetero === 1,
        a.sstruc,
        a.inscode
      )

      atomIndexDict[a.index + atomCount] = idx
      idx += 1
    })
    atomCount += structure.atomStore.count
    modelCount += structure.modelStore.count
  })

  const bondStore = s.bondStore
  const a1 = s.getAtomProxy()
  const a2 = s.getAtomProxy()

  atomCount = 0
  structures.forEach(structure => {
    structure.eachBond(b => {
      a1.index = atomIndexDict[b.atomIndex1 + atomCount]
      a2.index = atomIndexDict[b.atomIndex2 + atomCount]
      bondStore.addBond(a1, a2, b.bondOrder)
    })
    atomCount += structure.atomStore.count
  })

  sb.finalize()

  calculateBondsBetween(s, true)  // calculate backbone bonds
  calculateBondsWithin(s, true)  // calculate rung bonds

  s.finalizeAtoms()
  s.finalizeBonds()
  assignResidueTypeBonds(s)

  if (Debug) Log.timeEnd("concatStructures")

  return s
}

/*
*
* CATANA modifications
*
*/

/**
 * Returns filter string of form @a,b,c,d,... where a,b,c,d... correspond to indices of residue atoms
 * meeting the predicate function "pred".
 */
export function getResidueAtomsFilterString(rp: ResidueProxy, pred: (a: AtomProxy) => boolean): string {
  let filterString = "@";

  rp.eachAtom(ap => {
    if (pred(ap)) {
      filterString += ap.index + ",";
    }
  });

  filterString = filterString.slice(0, -1); // Leaving comma at the end makes the filtering work wrong!

  return filterString;
}

/**
 * Moves the structure's atoms to have their center of mass located at new location
 */
export function recenterAtoms(structure: Structure, newCenterPosition: Vector3, refreshPosBefore: boolean = false, refreshPosAfter: boolean = false) {
  if (refreshPosBefore) {
    structure.refreshPosition(); // Needed because of the call to structure.center
  }

  const as = structure.atomStore;
  const currCenter = structure.center;

  const xOffset = newCenterPosition.x - currCenter.x;
  const yOffset = newCenterPosition.y - currCenter.y;
  const zOffset = newCenterPosition.z - currCenter.z;

  for (let i = 0; i < as.count; ++i) {
    as.x[i] += xOffset;
    as.y[i] += yOffset;
    as.z[i] += zOffset;
  }

  // TODO Is this really needed or not?
  structure._hasCoords = undefined;  // Bit of encapsulation breaker but can be survived rn

  if (refreshPosAfter) {
    structure.refreshPosition();
  }
}

/**
 * Multiplies atoms from the given structure by the provided transformation matrix
 */
export function transformAtoms(structure: Structure, transformationMatrix: Matrix4, refreshPosAfter: boolean = true, filter: boolean | Filter | BitArray_Legacy = true) {
  const as = structure.atomStore;
  const aSet = structure.getAtomSet(filter);
  let tmp: Vector3 = new Vector3();

  for (let i = 0; i < as.count; ++i) {
    if (!aSet.isSet(i)) {
      continue;
    }

    tmp.set(as.x[i], as.y[i], as.z[i]).applyMatrix4(transformationMatrix);

    as.x[i] = tmp.x;
    as.y[i] = tmp.y;
    as.z[i] = tmp.z;
  }

  structure._hasCoords = undefined;

  if (refreshPosAfter) {
    structure.refreshPosition();
  }
}


/**
 * Creates a rotation matrix rotating about vector defined by the two provided atoms.
 * Origin of the rotation is the second atom. Angles are expected to be in degrees.
 * More angles of rotation can be provided. In such a case, one transformation matrix for each angle will be returned. 
 */
export function rotateAroundAtomsVector(vectorStartAtom: AtomProxy, vectorEndAtom: AtomProxy, ...angles: number[]): Matrix4[] {
  const vctStartPos = vectorStartAtom.positionToVector3();
  const vctEndPos = vectorEndAtom.positionToVector3();
  const rotVct = vctEndPos.clone().sub(vctStartPos).normalize();

  const translToOrigin = new Matrix4().makeTranslation(-vectorEndAtom.x, -vectorEndAtom.y, -vectorEndAtom.z);
  const translFromOrigin = new Matrix4().makeTranslation(vectorEndAtom.x, vectorEndAtom.y, vectorEndAtom.z);

  let result: Matrix4[] = [];

  for (let angle of angles) {
    const quatRotation = new Quaternion().setFromAxisAngle(rotVct, MathUtils.degToRad(angle));

    result.push(
      translFromOrigin.clone()
        .multiply(
          new Matrix4().makeRotationFromQuaternion(quatRotation)
            .multiply(translToOrigin)
        ));
  }

  return result;
}

/**
 * Overrides chain and residue names in the provided structure.
 * 
 * @remark
 * Can be used, e.g., for structures loaded from SDF files
 * to provide them with data which are not by default stored in this file format 
 */
export function overrideChainResNamesOfStructure(structure: Structure, resName: string, resNo: number = 0, firstChainName: string = 'A', chainIdStart: number = 0) {
  let currChainNameIdx = ChainnameAlphabet.indexOf(firstChainName) + 1;
  let currChainId = chainIdStart;
  let currResNo = resNo;

  structure.eachChain(chain => {
    chain.chainname = ChainnameAlphabet[(currChainNameIdx++) % ChainnameAlphabet.length];
    chain.chainid = (currChainId++).toString();
  });

  structure.eachResidue(residue => {
    residue.residueType.resname = resName;
    residue.resno = currResNo++;
  });
}

/**
 * Appends one all-atom structure to another
 */
export function appendStructures(parentStructure: Structure, structureToAppend: Structure,
  appendedAtomsTransformation: Matrix4 | undefined = undefined): Structure {
  const sb = new StructureBuilder(parentStructure);

  const atomStore = parentStructure.atomStore as any;
  const atomMap = parentStructure.atomMap;

  const atomIndexDict: { [k: number]: number } = {};

  const initAtomCount = atomStore.count;
  let idx = initAtomCount;
  let atomCount = initAtomCount;
  let modelCount = parentStructure.modelStore.count;

  // If the structure to append has same chain names as the parent structure
  // change these names to a unique ones if possible
  const chainNameRemapping: { [n: string]: string } = {};
  const chainIndexRemapping: { [n: number]: number } = {};
  //let newChainIndices: number[] = [];
  let maxExistingNameAlpIdx = -1;

  parentStructure.eachChain(chain => {
    maxExistingNameAlpIdx = Math.max(maxExistingNameAlpIdx,
      ChainnameAlphabet.indexOf(chain.chainname));
  });

  structureToAppend.eachChain(appChain => {
    const newNameIdx = (maxExistingNameAlpIdx + 1
      + ChainnameAlphabet.indexOf(appChain.chainname))
      % ChainnameAlphabet.length;
    chainNameRemapping[appChain.chainname] = ChainnameAlphabet[newNameIdx];
  });

  structureToAppend.eachAtom(a => {
    atomStore.growIfFull();
    atomStore.atomTypeId[idx] = atomMap.add(a.atomname, a.element);

    if (appendedAtomsTransformation !== undefined) {
      const newAtomPos = new Vector3(a.x, a.y, a.z).applyMatrix4(appendedAtomsTransformation);
      atomStore.x[idx] = newAtomPos.x;
      atomStore.y[idx] = newAtomPos.y;
      atomStore.z[idx] = newAtomPos.z;
    } else {
      atomStore.x[idx] = a.x;
      atomStore.y[idx] = a.y;
      atomStore.z[idx] = a.z;
    }

    atomStore.serial[idx] = a.serial + atomCount;
    if (atomStore.formalCharge) {
      atomStore.formalCharge[idx] = a.formalCharge;
    }
    if (atomStore.partialCharge) {
      atomStore.partialCharge[idx] = a.partialCharge;
    }
    atomStore.altloc[idx] = a.altloc;
    atomStore.occupancy[idx] = a.occupancy;
    atomStore.bfactor[idx] = a.bfactor;

    const atomChainName = chainNameRemapping[a.chainname] ?? a.chainname;

    sb.addAtom(
      a.modelIndex + modelCount,
      atomChainName,
      a.chainid,
      a.resname,
      a.resno,
      a.hetero === 1,
      a.sstruc,
      a.inscode
    );

    /*if (!chainIndexRemapping[a.chainIndex]) {
      chainIndexRemapping[a.chainIndex] = sb.currentChainIndex;
      newChainIndices.push(sb.currentChainIndex);
    }*/

    // Trying to extend the biological assembly of current structure with
    // the newly appeared chain names
    if (parentStructure.biomolDict.BU1) {
      if (parentStructure.biomolDict.BU1.partList.length > 0) {
        if (parentStructure.biomolDict.BU1.partList[0].chainList.indexOf(atomChainName) < 0) {
          parentStructure.biomolDict.BU1.partList[0].chainList.push(atomChainName);
        }
      }
    }

    atomIndexDict[a.index + atomCount] = idx;
    ++idx;
  });

  const bondStore = parentStructure.bondStore;
  const a1 = parentStructure.getAtomProxy();
  const a2 = parentStructure.getAtomProxy();

  atomCount = initAtomCount;
  structureToAppend.eachBond(b => {
    a1.index = atomIndexDict[b.atomIndex1 + atomCount];
    a2.index = atomIndexDict[b.atomIndex2 + atomCount];
    bondStore.addBond(a1, a2, b.bondOrder);
  });

  sb.finalize();

  calculateBondsBetween(parentStructure, true);  // calculate backbone bonds
  calculateBondsWithin(parentStructure, true);   // calculate rung bonds

  parentStructure.finalizeAtoms();
  parentStructure.finalizeBonds();
  assignResidueTypeBonds(parentStructure);

  calculateSecondaryStructure(parentStructure);

  // Trying to preserve entities from both structures
  if (structureToAppend.entityList.length > 0) {
    structureToAppend.entityList.forEach(entityToAppend => {
      parentStructure.entityList.push(new Entity(parentStructure,
        parentStructure.entityList.length, entityToAppend.description, entityToAppend.type,
        entityToAppend.chainIndexList.map(x => chainIndexRemapping[x])));
    });
  }

  parentStructure.signals.refreshed.dispatch();

  return parentStructure;
}

/**
 * Duplicates given all-atom structure 
 */
export function duplicateStructure(sourceStructure: Structure): Structure {
  const duplicatedStructure = new Structure(sourceStructure.name, sourceStructure.path);

  for (let assembly in sourceStructure.biomolDict) {
    duplicatedStructure.biomolDict[assembly] = sourceStructure.biomolDict[assembly];
  }

  return appendStructures(duplicatedStructure, sourceStructure);
}

/**
 * Creates new structure based on the {@link oldStructure} but storing only atoms passing the provided filter
 */
export function exportFilteringAsNewStructure(oldStructure: Structure, filter: boolean | Filter | BitArray_Legacy) {
  const s = new Structure(oldStructure.name + "_filter_subset", "");
  const sb = new StructureBuilder(s);

  const strucAtomSet = oldStructure.getAtomSet(filter);

  const atomStore = s.atomStore as any;
  const atomMap = s.atomMap;
  atomStore.addField('formalCharge', 1, 'int8');
  atomStore.addField('partialCharge', 1, 'float32');

  const atomIndexDict: { [k: number]: number } = {}
  let idx = 0;

  oldStructure.eachAtom(a => {
    if (!strucAtomSet.isSet(a.index)) {
      return;
    }

    atomIndexDict[a.index] = idx;

    atomStore.growIfFull();
    atomStore.atomTypeId[idx] = atomMap.add(a.atomname, a.element);

    atomStore.x[idx] = a.x;
    atomStore.y[idx] = a.y;
    atomStore.z[idx] = a.z;
    atomStore.serial[idx] = a.serial;
    atomStore.formalCharge[idx] = a.formalCharge;
    atomStore.partialCharge[idx] = a.partialCharge;
    atomStore.altloc[idx] = a.altloc;
    atomStore.occupancy[idx] = a.occupancy;
    atomStore.bfactor[idx] = a.bfactor;

    sb.addAtom(
      a.modelIndex,
      a.chainname,
      a.chainid,
      a.resname,
      a.resno,
      a.hetero === 1,
      a.sstruc,
      a.inscode
    );

    ++idx;
  });

  const bondStore = s.bondStore;
  const a1 = s.getAtomProxy();
  const a2 = s.getAtomProxy();

  oldStructure.eachBond(b => {
    if (strucAtomSet.isSet(b.atomIndex1) && strucAtomSet.isSet(b.atomIndex2)) {
      a1.index = atomIndexDict[b.atomIndex1];
      a2.index = atomIndexDict[b.atomIndex2];
      bondStore.addBond(a1, a2, b.bondOrder);
    }
  });

  sb.finalize();

  calculateBondsBetween(s, true);
  calculateBondsWithin(s, true);

  s.finalizeAtoms();
  s.finalizeBonds();
  assignResidueTypeBonds(s);

  return s;
}

/**
 * Returns residue proxy corresponding to the desired chain end
 */
export function getChainTerminusResidue(chain: ChainProxy, endToReturn: 'C' | 'N'): ResidueProxy {
  if (endToReturn === 'N') {
    return chain.structure.getResidueProxy(chain.residueOffset);
  }
  return chain.structure.getResidueProxy(chain.residueEnd);
}

/**
 * Returns vector aligned with the direction of the desired chain end
 */
export function getChainTerminusDirection(chain: ChainProxy, endToReturn: 'C' | 'N',
  defaultDir: Vector3 = new Vector3(1, 0, 0)): Vector3 {

  if (chain.residueCount < 1) {
    return defaultDir;
  }

  const lastResidue = getChainTerminusResidue(chain, endToReturn);
  const lastResidueBbStart: AtomProxy = chain.structure.getAtomProxy(lastResidue.backboneStartAtomIndex);
  const lastResidueBbEnd: AtomProxy = chain.structure.getAtomProxy(lastResidue.backboneEndAtomIndex);
  const dir = new Vector3(
    lastResidueBbEnd.x - lastResidueBbStart.x,
    lastResidueBbEnd.y - lastResidueBbStart.y,
    lastResidueBbEnd.z - lastResidueBbStart.z).normalize();

  return endToReturn === 'C' ? dir : dir.negate();
}

/**
 * Returns normal of the plane defined by three atoms
 */
export function getAtomsPlaneNormal(a1: AtomProxy, a2: AtomProxy, a3: AtomProxy): Vector3 {
  const a1PosV3 = new Vector3(a1.x, a1.y, a1.z);
  const a2PosV3 = new Vector3(a2.x, a2.y, a2.z);
  const a3PosV3 = new Vector3(a3.x, a3.y, a3.z);

  return (a3PosV3.sub(a2PosV3)).cross(a1PosV3.sub(a2PosV3)).normalize();
}

/**
 * Appends n residues to the C-term or N-term of the desired chain.
 * An important feature of this function is that it tries to preserve the consecutivity
 * of neighboring chains/residues/atoms, i.e., they should still be stored sequentially.
 * Automatically removes corresponding H20 atoms from appended residues.
 * 
 * @param targetStructure structure to be extended with new residues
 * @param chainIndex chain to which the residues should be appended
 * @param structureWithResToAppend structure containing the residue (only one!) to append
 * @param appendToChainEnd chain end to append to (determines 3D coordinates of atoms & placement in data structures)
 * @param duplicatesToAppend how many residues to append
 * @param resToAppendNameOverride the name of new residue (if not set, default name will be used)
 * @param removeHydrogensFromAppendedResidue determines whether all hydrogen (H) atoms should be removed from appended residue
 * @param direction direction to which to add the residues
 */
export function appendResiduesToChain(targetStructure: Structure, chainIndex: number,
  structureWithResToAppend: Structure, appendToChainEnd: 'C' | 'N' = 'C', duplicatesToAppend: number = 1,
  resToAppendNameOverride: string | undefined = undefined, removeHydrogensFromAppendedResidue: boolean = true, direction?: Vector3): Structure {
  // Amino acids are connected by peptide bonds between respective C(OOH) and N(H2) atoms / termini.
  // The distance of the bond seems to be usually somewhere around this number.
  // This function tries to position the new residue in such a way to have this distance fulfilled.
  const ncBondLengthAngstrom = 1.32;

  // All modifications to the appended structure and its atoms must be done
  // before computing some aggregation etc. data based on the atom positions

  if (resToAppendNameOverride !== undefined) {
    overrideChainResNamesOfStructure(structureWithResToAppend, resToAppendNameOverride);
  }

  if (removeHydrogensFromAppendedResidue) {
    structureWithResToAppend.removeElements("H");
  }

  if (structureWithResToAppend.residueStore.count < 1) {
    console.warn("Trying to process structure without residues!", structureWithResToAppend);
    return targetStructure;
  }
  else if (structureWithResToAppend.residueStore.count > 1) {
    console.warn("Trying to process structure with invalid (>1) number of residues!", structureWithResToAppend);
  }

  let residueToAppend: ResidueProxy = structureWithResToAppend.getResidueProxy(0);

  // Removing the respective (CO)-OH or (NH)-H atoms to prepare the appended residue for becoming part of a chain
  if (appendToChainEnd === 'C') {
    residueToAppend.removeHAtomFromNH2();
  } else {
    residueToAppend.removeOHAtomsfromCOOH();
  }

  const chainProxy = targetStructure.getChainProxy(chainIndex);
  let lastChainResidue: ResidueProxy = getChainTerminusResidue(chainProxy, appendToChainEnd);
  const chainEndDirection: Vector3 = direction ? direction : getChainTerminusDirection(chainProxy, appendToChainEnd);
  const lastChainResIdx = lastChainResidue.index;
  const isLastChainResPreceding: boolean = appendToChainEnd === 'C';
  residueToAppend = structureWithResToAppend.getResidueProxy(0);

  const addedResidueBackboneStartAtom: AtomProxy = structureWithResToAppend.getAtomProxy(residueToAppend.backboneStartAtomIndex);
  const addedResidueBackboneEndAtom: AtomProxy = structureWithResToAppend.getAtomProxy(residueToAppend.backboneEndAtomIndex);
  const addedResidueBackboneDir: Vector3 =
    new Vector3(addedResidueBackboneEndAtom.x, addedResidueBackboneEndAtom.y, addedResidueBackboneEndAtom.z).sub(
      new Vector3(addedResidueBackboneStartAtom.x, addedResidueBackboneStartAtom.y, addedResidueBackboneStartAtom.z)
    ).normalize();

  // Align the backbone axis of added residue with chain end direction.
  // The rotation will remain same for all duplicates so it can be done just once.
  // NOTE The side effect of computing the direction only once is that adding 3 duplicates of amino acid X
  //      might result in different direction than appending amino acid X three times by three separates calls of this function.
  //      This should not be an issue hopefully but it is good to keep this in mind. 
  //
  // In case of appending to N-terminus, the chainEndDirection goes in the opposite direction of the strand.
  // This is useful for offsetting added residues but during the rotation, it would "flip" our residue 
  // making it go from C to N terminus. To avoid this, we negate this vector again.
  const dirToAlignTo = appendToChainEnd === 'C' ? chainEndDirection : chainEndDirection.clone().negate();
  transformAtoms(structureWithResToAppend,
    new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(addedResidueBackboneDir, dirToAlignTo)), true);

  // To (try to) preserve the zig-zag backbone atoms pattern, it is detected
  // in which direction the normal of N-C(alpha)-C plane faces in the last residue and newly appended one.
  // If they face the same direction, the newly appended residue is rotated.
  const lastResAlphaCarb = lastChainResidue.getAtomIndexByName("CA");
  const addResAlphaCarb = residueToAppend.getAtomIndexByName("CA");

  const lastResNormDir = getAtomsPlaneNormal(
    targetStructure.getAtomProxy(lastResAlphaCarb),
    targetStructure.getAtomProxy(lastChainResidue.backboneEndAtomIndex),
    targetStructure.getAtomProxy(lastChainResidue.backboneStartAtomIndex));

  const addResNormDir = getAtomsPlaneNormal(
    structureWithResToAppend.getAtomProxy(addResAlphaCarb),
    addedResidueBackboneEndAtom, addedResidueBackboneStartAtom);

  if (lastResNormDir.dot(addResNormDir) > 0) {
    transformAtoms(structureWithResToAppend,
      new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(dirToAlignTo, Math.PI)), true);
  }

  const addedResidueBackboneCloserEndAtom: AtomProxy = structureWithResToAppend.getAtomProxy(
    appendToChainEnd === 'C' ? residueToAppend.backboneStartAtomIndex : residueToAppend.backboneEndAtomIndex);

  let addedResidueEndAtomCenterOffset =
    new Vector3(addedResidueBackboneCloserEndAtom.x, addedResidueBackboneCloserEndAtom.y, addedResidueBackboneCloserEndAtom.z)
      .sub(structureWithResToAppend.center);

  for (let i = 0; i < duplicatesToAppend; ++i) {
    lastChainResidue = getChainTerminusResidue(chainProxy, appendToChainEnd);

    if (appendToChainEnd === 'C') {
      lastChainResidue.removeOHAtomsfromCOOH();
    } else {
      lastChainResidue.removeHAtomFromNH2();
    }

    const lastChainResBackboneCloserEndAtom: AtomProxy = targetStructure.getAtomProxy(
      appendToChainEnd === 'C' ? lastChainResidue.backboneEndAtomIndex : lastChainResidue.backboneStartAtomIndex);

    if (i > 0) {
      // Rotate the residue to achieve zig-zag-like pattern of the backbone.
      // Rotation happens around the N-C atoms axis so, in theory, it should just reposition the alpha carbon and sidechain
      // above/below the N-C backbone axis.
      // Since the transformAtoms* calls accumulate, doing 180 degrees rotation every iteration
      // makes the code basically switch between "rotated"/"not rotated" states which is exactly the desired behavior.
      transformAtoms(structureWithResToAppend,
        new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(dirToAlignTo, Math.PI)), true);

      addedResidueEndAtomCenterOffset =
        new Vector3(addedResidueBackboneCloserEndAtom.x, addedResidueBackboneCloserEndAtom.y, addedResidueBackboneCloserEndAtom.z)
          .sub(structureWithResToAppend.center);
    }

    // Move the new residue to location meeting the desired peptide bond length
    recenterAtoms(structureWithResToAppend, new Vector3(lastChainResBackboneCloserEndAtom.x, lastChainResBackboneCloserEndAtom.y, lastChainResBackboneCloserEndAtom.z)
      .add(chainEndDirection.clone().normalize().multiplyScalar(ncBondLengthAngstrom))
      .sub(addedResidueEndAtomCenterOffset), false, true);

    // Insert residue into data structures
    const newResidueIndex = lastChainResIdx + (isLastChainResPreceding ? i + 1 : 0);

    insertResidueToStore(targetStructure, chainIndex, residueToAppend, newResidueIndex);
    assignAtomsToResidue(targetStructure, newResidueIndex, residueToAppend);

    targetStructure.backboneBondStore.clear();
    targetStructure.rungBondStore.clear();

    calculateBonds(targetStructure);

    targetStructure.finalizeAtoms();
    targetStructure.finalizeBonds();
    assignResidueTypeBonds(targetStructure);
  }

  targetStructure.signals.refreshed.dispatch();

  return targetStructure;
}

/**
 * Inserts new residue to the residue store of the provided structure
 */
function insertResidueToStore(targetStructure: Structure, targetChainIndex: number, residue: ResidueProxy, newResidueIndex: number): void {
  const atomStore: AtomStore = targetStructure.atomStore;
  const resStore: ResidueStore = targetStructure.residueStore;
  const chainStore: ChainStore = targetStructure.chainStore;

  resStore.growIfFull();

  const isNewEndRes = (chainStore.residueOffset[targetChainIndex] + chainStore.residueCount[targetChainIndex]) === newResidueIndex;

  // Update all indices referencing residues which need to be shifted
  const newResResno = isNewEndRes ? resStore.resno[newResidueIndex - 1] + 1 : resStore.resno[newResidueIndex];
  const existingSstruc = isNewEndRes ? resStore.getSstruc(newResidueIndex - 1) : resStore.getSstruc(newResidueIndex);
  for (let i = resStore.count - 1; i >= newResidueIndex; --i) {
    const resNoOffset = resStore.chainIndex[i] === targetChainIndex ? 1 : 0;

    resStore.chainIndex[i + 1] = resStore.chainIndex[i];
    resStore.atomOffset[i + 1] = resStore.atomOffset[i];
    resStore.atomCount[i + 1] = resStore.atomCount[i];
    resStore.residueTypeId[i + 1] = resStore.residueTypeId[i];
    resStore.resno[i + 1] = resStore.resno[i] + resNoOffset;
    resStore.sstruc[i + 1] = resStore.sstruc[i];
    resStore.inscode[i + 1] = resStore.inscode[i];
  }

  for (let i = 0; i < atomStore.count; ++i) {
    if (atomStore.residueIndex[i] >= newResidueIndex) {
      ++atomStore.residueIndex[i];
    }
  }

  for (let i = 0; i < chainStore.count; ++i) {
    if (targetChainIndex !== i && chainStore.residueOffset[i] >= newResidueIndex) {
      ++chainStore.residueOffset[i];
    }
  }

  // Set residue data
  resStore.chainIndex[newResidueIndex] = targetChainIndex;
  resStore.atomOffset[newResidueIndex] = 0; // Placeholder value 
  resStore.atomCount[newResidueIndex] = 0; // Placeholder value
  resStore.residueTypeId[newResidueIndex] = 0; // Placeholder value
  resStore.resno[newResidueIndex] = newResResno;

  // Use the same secondary structure reference as the existing residues
  if (existingSstruc) {
    resStore.setSstruc(newResidueIndex, existingSstruc);
  }

  if (residue.inscode) {
    resStore.setInscode(newResidueIndex, residue.inscode);
  }

  ++resStore.count;
  ++chainStore.residueCount[targetChainIndex];
}

/**
 * Sets atoms for the residue with index {@link newResidueIndex}
 */
function assignAtomsToResidue(targetStructure: Structure, newResidueIndex: number, sourceResidueWithAtoms: ResidueProxy): void {
  const atomStore = targetStructure.atomStore;
  const bondStore = targetStructure.bondStore;
  const resStore = targetStructure.residueStore;
  const atomsToAddCount = sourceResidueWithAtoms.atomCount;

  const newResAtomOffset =
    newResidueIndex === resStore.count - 1 ? atomStore.count :
      (newResidueIndex === 0 ? 0 : resStore.atomOffset[newResidueIndex + 1]);

  // Set atom-related properties of the newly added residue
  resStore.atomOffset[newResidueIndex] = newResAtomOffset;
  resStore.atomCount[newResidueIndex] = atomsToAddCount;

  // Shift existing atoms data and residue-to-atom references
  const initialAtomStoreCount = atomStore.count;
  atomStore.count += atomsToAddCount;
  atomStore.resize(atomStore.count);

  const newAtomsSerialStart = newResAtomOffset === atomStore.count ?
    atomStore.serial[atomStore.count - 1] + 1 : atomStore.serial[newResAtomOffset];

  for (let i = initialAtomStoreCount - 1; i >= newResAtomOffset; --i) {
    atomStore.residueIndex[i + atomsToAddCount] = atomStore.residueIndex[i];
    atomStore.atomTypeId[i + atomsToAddCount] = atomStore.atomTypeId[i];
    atomStore.x[i + atomsToAddCount] = atomStore.x[i];
    atomStore.y[i + atomsToAddCount] = atomStore.y[i];
    atomStore.z[i + atomsToAddCount] = atomStore.z[i];
    atomStore.serial[i + atomsToAddCount] = atomStore.serial[i] + atomsToAddCount;
    atomStore.bfactor[i + atomsToAddCount] = atomStore.bfactor[i];
    atomStore.altloc[i + atomsToAddCount] = atomStore.altloc[i];
    atomStore.occupancy[i + atomsToAddCount] = atomStore.occupancy[i];

    if (atomStore.partialCharge) {
      atomStore.partialCharge[i + atomsToAddCount] = atomStore.partialCharge[i];
    }

    if (atomStore.formalCharge) {
      atomStore.formalCharge[i + atomsToAddCount] = atomStore.formalCharge[i];
    }
  }

  for (let i = 0; i < bondStore.count; ++i) {
    if (bondStore.atomIndex1[i] >= newResAtomOffset) {
      bondStore.atomIndex1[i] += atomsToAddCount;
    }

    if (bondStore.atomIndex2[i] >= newResAtomOffset) {
      bondStore.atomIndex2[i] += atomsToAddCount;
    }
  }

  for (let i = newResidueIndex + 1; i < resStore.count; ++i) {
    resStore.atomOffset[i] += atomsToAddCount;
  }

  // Set new atoms & related data

  let i = 0;
  sourceResidueWithAtoms.eachAtom(atom => {
    atomStore.residueIndex[i + newResAtomOffset] = newResidueIndex;
    atomStore.atomTypeId[i + newResAtomOffset] = targetStructure.atomMap.add(atom.atomname, atom.element);
    atomStore.x[i + newResAtomOffset] = atom.x;
    atomStore.y[i + newResAtomOffset] = atom.y;
    atomStore.z[i + newResAtomOffset] = atom.z;
    atomStore.serial[i + newResAtomOffset] = newAtomsSerialStart + i;
    atomStore.bfactor[i + newResAtomOffset] = atom.bfactor;
    if (atom.altloc) {
      atomStore.setAltloc(i + newResAtomOffset, atom.altloc);
    }
    atomStore.occupancy[i + newResAtomOffset] = 1.0;

    if (atomStore.partialCharge && atom.partialCharge) {
      atomStore.partialCharge[i + newResAtomOffset] = atom.partialCharge;
    }

    if (atomStore.formalCharge && atom.formalCharge) {
      atomStore.formalCharge[i + newResAtomOffset] = atom.formalCharge;
    }

    ++i;
  });

  const oldBonds = sourceResidueWithAtoms.getBonds();
  for (let i = 0; i < oldBonds.atomIndices1.length; ++i) {
    bondStore.growIfFull();

    bondStore.atomIndex1[bondStore.count] = oldBonds.atomIndices1[i] + newResAtomOffset;
    bondStore.atomIndex2[bondStore.count] = oldBonds.atomIndices2[i] + newResAtomOffset;
    bondStore.bondOrder[bondStore.count] = oldBonds.bondOrders[i];

    ++bondStore.count;
  }

  const atomTypeIdList = new Array(atomsToAddCount);
  for (let i = 0; i < atomsToAddCount; ++i) {
    atomTypeIdList[i] = atomStore.atomTypeId[newResAtomOffset + i];
  }

  // TODO Should we also remove the old record from residue map or somehow modify?

  resStore.residueTypeId[newResidueIndex] = targetStructure.residueMap.add(
    sourceResidueWithAtoms.resname, atomTypeIdList, false);
}

/**
 * Replaces given residue with a different one.
 * Atuomatically removes H2O atoms.
 * 
 * @param targetStructure structure to be modified (containing the residue to be mutated)
 * @param residueIndex index of residue to be mutated
 * @param structureWithResToMutateTo structure containing the residue to mutate to
 * @param newResNameOverride the name of new resulting residue
 * @param removeHydrogensFromAppendedResidue determines whether H atoms should be removed from residue being appended
 */
export function mutateResidue(targetStructure: Structure, residueIndex: number,
  structureWithResToMutateTo: Structure, newResNameOverride: string | undefined = undefined, removeHydrogensFromAppendedResidue: boolean = true): Structure {
  if (newResNameOverride !== undefined) {
    overrideChainResNamesOfStructure(structureWithResToMutateTo, newResNameOverride);
  }

  const oldRes = targetStructure.getResidueProxy(residueIndex);
  const newRes: ResidueProxy = structureWithResToMutateTo.getResidueProxy(0);

  // Remove H2O atoms from added residue and neighbours of old residue
  if (removeHydrogensFromAppendedResidue) {
    structureWithResToMutateTo.removeElements("H");
  }

  const nextResidueIndex = residueIndex + 1;
  const prevResidueIndex = residueIndex - 1;

  if (oldRes.chain.residueCount > 1) {
    if (residueIndex === oldRes.chain.residueOffset) { // N-term residue
      newRes.removeOHAtomsfromCOOH();
      oldRes.structure.getResidueProxy(nextResidueIndex).removeHAtomFromNH2();
    } else if (residueIndex === oldRes.chain.residueEnd) { // C-term residue
      newRes.removeHAtomFromNH2();
      oldRes.structure.getResidueProxy(prevResidueIndex).removeOHAtomsfromCOOH();
    } else { // Residue "in the middle"
      newRes.removeHAtomFromNH2();
      newRes.removeOHAtomsfromCOOH();
      oldRes.structure.getResidueProxy(nextResidueIndex).removeHAtomFromNH2();
      oldRes.structure.getResidueProxy(prevResidueIndex).removeOHAtomsfromCOOH();
    }
  }

  // Compute the positional information of the old residue
  // and then remove it together with its atoms
  const oldResBbStart = targetStructure.getAtomProxy(oldRes.backboneStartAtomIndex);
  const oldResBbEnd = targetStructure.getAtomProxy(oldRes.backboneEndAtomIndex);

  const oldResBbDir = new Vector3(
    oldResBbEnd.x - oldResBbStart.x,
    oldResBbEnd.y - oldResBbStart.y,
    oldResBbEnd.z - oldResBbStart.z
  ).normalize();

  const oldResBbCenter = new Vector3(
    0.5 * (oldResBbEnd.x + oldResBbStart.x),
    0.5 * (oldResBbEnd.y + oldResBbStart.y),
    0.5 * (oldResBbEnd.z + oldResBbStart.z)
  );

  const oldResChainIdx = oldRes.chainIndex;

  const oldResAlphaCarb = oldRes.getAtomIndexByName("CA");
  const oldResNormDir = getAtomsPlaneNormal(
    targetStructure.getAtomProxy(oldResAlphaCarb),
    oldResBbEnd, oldResBbStart);

  targetStructure.removeResidue(oldRes);

  // Insert new residue into the given position
  const newResBbStart: AtomProxy = structureWithResToMutateTo.getAtomProxy(newRes.backboneStartAtomIndex);
  const newResBbEnd: AtomProxy = structureWithResToMutateTo.getAtomProxy(newRes.backboneEndAtomIndex);

  const newResBbDir = new Vector3(
    newResBbEnd.x - newResBbStart.x,
    newResBbEnd.y - newResBbStart.y,
    newResBbEnd.z - newResBbStart.z
  ).normalize();

  transformAtoms(structureWithResToMutateTo,
    new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(newResBbDir, oldResBbDir)), true);

  const newResAlphaCarb = newRes.getAtomIndexByName("CA");
  const newResNormDir = getAtomsPlaneNormal(
    structureWithResToMutateTo.getAtomProxy(newResAlphaCarb),
    newResBbEnd, newResBbStart);

  // If the N-CA-C "face" normals are facing in the different direction,
  // try to rotate the new residue to increase the chance of preserving the "zig-zag" pattern
  if (oldResNormDir.dot(newResNormDir) < 0) {
    transformAtoms(structureWithResToMutateTo,
      new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(oldResBbDir, Math.PI)), true);
  }

  const newResBbCenter = new Vector3(
    0.5 * (newResBbEnd.x + newResBbStart.x),
    0.5 * (newResBbEnd.y + newResBbStart.y),
    0.5 * (newResBbEnd.z + newResBbStart.z)
  );

  const addedResBbCenterStrucCenterOffset = new Vector3(
    newResBbCenter.x - structureWithResToMutateTo.center.x,
    newResBbCenter.y - structureWithResToMutateTo.center.y,
    newResBbCenter.z - structureWithResToMutateTo.center.z
  );

  recenterAtoms(structureWithResToMutateTo, oldResBbCenter.clone().sub(addedResBbCenterStrucCenterOffset), false, true);

  insertResidueToStore(targetStructure, oldResChainIdx, newRes, residueIndex);
  assignAtomsToResidue(targetStructure, residueIndex, newRes);

  targetStructure.backboneBondStore.clear();
  targetStructure.rungBondStore.clear();

  calculateBonds(targetStructure);

  targetStructure.finalizeAtoms();
  targetStructure.finalizeBonds();
  assignResidueTypeBonds(targetStructure);

  targetStructure.signals.refreshed.dispatch();

  return targetStructure;
}

/**
 * Appends given residue to the given chain.
 * Expects to be provided with the desired position and orientation of the new residue.
 * Does not do any removal of atoms automatically (like H2O when peptide bond is created).
 * 
 * @param targetStructure structure to be modified
 * @param chainIndex chain to be appended to
 * @param structureWithResToAppend structure containing the residue to append
 * @param appendToChainEnd chain end (N ~ 5', C ~ 3') to be appended to (determines the placement of a residue in the data structures). 
 * @param centerPositionOfNewResidue centroid of a new residue
 * @param backboneDirectionofNewResidue vector to which the backbone of newly added residue should be aligned
 * @param resToAppendNameOverride name of the newly appended residue
 * @param removeHydrogensFromAppendedResidue determines whether to remove hydrogen atoms from the added residue
 */
export function appendResidueToChainManual(targetStructure: Structure, chainIndex: number,
  structureWithResToAppend: Structure, appendToChainEnd: 'C' | 'N' = 'C',
  transformationOfNewResidue: Matrix4, transformationOfNewResidueInverse?: Matrix4,
  resToAppendNameOverride: string | undefined = undefined, removeHydrogensFromAppendedResidue: boolean = true,
  finalizeBonds: boolean = true): Structure {


  if (resToAppendNameOverride !== undefined) {
    overrideChainResNamesOfStructure(structureWithResToAppend, resToAppendNameOverride);
  }

  if (removeHydrogensFromAppendedResidue) {
    structureWithResToAppend.removeElements("H");
  }

  if (structureWithResToAppend.residueStore.count < 1) {
    console.warn("Trying to process structure without residues!", structureWithResToAppend);
    return targetStructure;
  }
  else if (structureWithResToAppend.residueStore.count > 1) {
    console.warn("Trying to process structure with invalid (>1) number of residues!", structureWithResToAppend);
  }

  // Retrieve the important parts of the structure and then transform the residue atoms to desired location/orientation
  let residueToAppend: ResidueProxy = structureWithResToAppend.getResidueProxy(0);

  const chainProxy = targetStructure.getChainProxy(chainIndex);
  let lastChainResidue: ResidueProxy = getChainTerminusResidue(chainProxy, appendToChainEnd);
  const lastChainResIdx = lastChainResidue.index;
  const isLastChainResPreceding: boolean = appendToChainEnd === 'C';

  transformAtoms(structureWithResToAppend, transformationOfNewResidue, true);

  // Add the new residue to existing data structures
  const newResidueIndex = lastChainResIdx + (isLastChainResPreceding ? 1 : 0);

  insertResidueToStore(targetStructure, chainIndex, residueToAppend, newResidueIndex);
  assignAtomsToResidue(targetStructure, newResidueIndex, residueToAppend);

  if (finalizeBonds) {
    targetStructure.backboneBondStore.clear();
    targetStructure.rungBondStore.clear();

    calculateBonds(targetStructure);

    targetStructure.finalizeAtoms();
    targetStructure.finalizeBonds();
    assignResidueTypeBonds(targetStructure);
  } else {
    targetStructure.finalizeAtoms();
  }

  if (!transformationOfNewResidueInverse) {
    transformationOfNewResidueInverse = new Matrix4().getInverse(transformationOfNewResidue);
  }
  transformAtoms(structureWithResToAppend, transformationOfNewResidueInverse, true);

  targetStructure.signals.refreshed.dispatch();

  return targetStructure;
}
