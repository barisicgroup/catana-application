/**
 * @file Structure
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Vector3, Box3 } from 'three'
import { Signal } from 'signals'

import { Debug, Log, ColormakerRegistry } from '../globals'
import { defaults } from '../utils'
import { AtomPicker, BondPicker } from '../utils/picker'
import { copyWithin, arrayMin, arrayMax } from '../math/array-utils'
import BitArray_Legacy from '../utils/bitarray'
import RadiusFactory, { RadiusParams } from '../utils/radius-factory'
import { Matrix } from '../math/matrix-utils'
import PrincipalAxes from '../math/principal-axes'
import SpatialHash from '../geometry/spatial-hash'
import FilteredVolume from '../surface/filtered-volume'
import StructureView from './structure-view'
import { AtomDataParams, AtomData, BondDataParams, BondData } from './structure-data'
import { Data, createData } from './data'

import Entity from './entity'
import Unitcell from '../symmetry/unitcell'
import Validation from './validation'
import Filter from '../filtering/filter'
import Assembly from '../symmetry/assembly'
import Volume from '../surface/volume'
import Polymer from '../proxy/polymer'

import BondHash from '../store/bond-hash'
import BondStore from '../store/bond-store'
import AtomStore from '../store/atom-store'
import ResidueStore from '../store/residue-store'
import ChainStore from '../store/chain-store'
import ModelStore from '../store/model-store'

import AtomMap from '../store/atom-map'
import ResidueMap from '../store/residue-map'

import BondProxy from '../proxy/bond-proxy'
import AtomProxy from '../proxy/atom-proxy'
import ResidueProxy from '../proxy/residue-proxy'
import ChainProxy from '../proxy/chain-proxy'
import ModelProxy from '../proxy/model-proxy'
import { calculateBondsBetween, calculateBondsWithin, duplicateStructure } from './structure-utils'
import Store from "../store/store";

interface Structure {
  signals: StructureSignals

  name: string
  path: string
  title: string
  id: string

  data: Data

  atomCount: number
  bondCount: number

  header: StructureHeader
  extraData: StructureExtraData

  atomSetCache: { [k: string]: BitArray_Legacy }
  atomSetDict: { [k: string]: BitArray_Legacy }
  biomolDict: { [k: string]: Assembly }

  entityList: Entity[]
  unitcell?: Unitcell

  frames: Float32Array[]
  boxes: Float32Array[]

  validation?: Validation

  bondStore: BondStore
  backboneBondStore: BondStore
  rungBondStore: BondStore
  atomStore: AtomStore
  residueStore: ResidueStore
  chainStore: ChainStore
  modelStore: ModelStore

  atomMap: AtomMap
  residueMap: ResidueMap

  bondHash?: BondHash
  spatialHash?: SpatialHash

  atomSet?: BitArray_Legacy
  bondSet?: BitArray_Legacy

  center: Vector3
  boundingBox: Box3

  trajectory?: {
    name: string
    frame: number
  }

  getView(filter: Filter): StructureView

  _hasCoords?: boolean

  _bp: BondProxy
  _ap: AtomProxy
  _rp: ResidueProxy
  _cp: ChainProxy
}

export type StructureHeader = {
  releaseDate?: string
  depositionDate?: string
  resolution?: number
  rFree?: number
  rWork?: number
  experimentalMethods?: string[]
}

export type StructureExtraData = {
  cif?: object
  sdf?: object[]
}

export type StructureSignals = {
  refreshed: Signal
}

/**
 * Structure
 */
class Structure implements Structure {
  signals: StructureSignals = {
    refreshed: new Signal()
  }

  /**
   * @param {String} name - structure name
   * @param {String} path - source path
   */
  constructor(name = '', path = '') {
    this.init(name, path)
  }

  init(name: string, path: string) {
    this.name = name
    this.path = path
    this.title = ''
    this.id = ''

    this.data = createData(this)

    this.atomCount = 0
    this.bondCount = 0

    this.header = {}
    this.extraData = {}

    this.atomSetCache = {}
    this.atomSetDict = {}
    this.biomolDict = {}

    this.entityList = []
    this.unitcell = undefined

    this.frames = []
    this.boxes = []

    this.validation = undefined

    this.bondStore = new BondStore(0)
    this.backboneBondStore = new BondStore(0)
    this.rungBondStore = new BondStore(0)
    this.atomStore = new AtomStore(0)
    this.residueStore = new ResidueStore(0)
    this.chainStore = new ChainStore(0)
    this.modelStore = new ModelStore(0)

    this.atomMap = new AtomMap(this)
    this.residueMap = new ResidueMap(this)

    this.bondHash = undefined
    this.spatialHash = undefined

    this.atomSet = undefined
    this.bondSet = undefined

    this.center = new Vector3()
    this.boundingBox = new Box3()

    this._bp = this.getBondProxy()
    this._ap = this.getAtomProxy()
    this._rp = this.getResidueProxy()
    this._cp = this.getChainProxy()
  }

  get type() { return 'Structure' }

  finalizeAtoms() {
    this.atomSet = this.getAtomSet()
    this.atomCount = this.atomStore.count
    this.boundingBox = this.getBoundingBox(undefined, this.boundingBox)
    this.center = this.boundingBox.getCenter(new Vector3())
    this.spatialHash = new SpatialHash(this.atomStore, this.boundingBox)
  }

  finalizeBonds() {
    this.bondSet = this.getBondSet()
    this.bondCount = this.bondStore.count
    this.bondHash = new BondHash(this.bondStore, this.atomStore.count)

    this.atomSetCache = {}
    if (!this.atomSetDict.rung) {
      this.atomSetDict.rung = this.getAtomSet(false)
    }

    for (let name in this.atomSetDict) {
      this.atomSetCache['__' + name] = this.atomSetDict[name].clone()
    }
  }

  //

  getBondProxy(index?: number) {
    return new BondProxy(this, index)
  }

  getAtomProxy(index?: number) {
    return new AtomProxy(this, index)
  }

  getResidueProxy(index?: number) {
    return new ResidueProxy(this, index)
  }

  getChainProxy(index?: number) {
    return new ChainProxy(this, index)
  }

  getModelProxy(index?: number) {
    return new ModelProxy(this, index)
  }

  //

  getBondSet(/* filter */) {
    // TODO implement filter parameter

    const n = this.bondStore.count
    const bondSet = new BitArray_Legacy(n)
    const atomSet = this.atomSet

    if (atomSet) {
      if (atomSet.isAllSet()) {
        bondSet.setAll()
      } else if (atomSet.isAllClear()) {
        bondSet.clearAll()
      } else {
        const bp = this.getBondProxy()

        for (let i = 0; i < n; ++i) {
          bp.index = i
          if (atomSet.isSet(bp.atomIndex1, bp.atomIndex2)) {
            bondSet.set(bp.index)
          }
        }
      }
    } else {
      bondSet.setAll()
    }

    return bondSet
  }

  getBackboneBondSet(/* filter */) {
    // TODO implement filter parameter

    const n = this.backboneBondStore.count
    const backboneBondSet = new BitArray_Legacy(n)
    const backboneAtomSet = this.atomSetCache.__backbone

    if (backboneAtomSet) {
      const bp = this.getBondProxy()
      bp.bondStore = this.backboneBondStore

      for (let i = 0; i < n; ++i) {
        bp.index = i
        if (backboneAtomSet.isSet(bp.atomIndex1, bp.atomIndex2)) {
          backboneBondSet.set(bp.index)
        }
      }
    } else {
      backboneBondSet.setAll()
    }

    return backboneBondSet
  }

  getRungBondSet(/* filter */) {
    // TODO implement filter parameter

    const n = this.rungBondStore.count
    const rungBondSet = new BitArray_Legacy(n)
    const rungAtomSet = this.atomSetCache.__rung

    if (rungAtomSet) {
      const bp = this.getBondProxy()
      bp.bondStore = this.rungBondStore

      for (let i = 0; i < n; ++i) {
        bp.index = i
        if (rungAtomSet.isSet(bp.atomIndex1, bp.atomIndex2)) {
          rungBondSet.set(bp.index)
        }
      }
    } else {
      rungBondSet.setAll()
    }

    return rungBondSet
  }

  /**
   * Get a set of atoms
   * @param  {Boolean|Filter|BitArray_Legacy} filter - object defining how to
   *                                      initialize the atom set.
   *                                      Boolean: init with value;
   *                                      Filter: init with filter;
   *                                      BitArray: return bit array
   * @return {BitArray_Legacy} set of atoms
   */
  getAtomSet(filter?: boolean | Filter | BitArray_Legacy) {
    const n = this.atomStore.count

    if (filter === undefined) {
      return new BitArray_Legacy(n, true)
    } else if (filter instanceof BitArray_Legacy) {
      return filter
    } else if (filter === true) {
      return new BitArray_Legacy(n, true)
    } else if (filter && filter.test) {
      const filtString = filter.string
      if (filtString in this.atomSetCache) {
        return this.atomSetCache[filtString]
      } else {
        if (filtString === '') {
          return new BitArray_Legacy(n, true)
        } else {
          const atomSet = new BitArray_Legacy(n)
          this.eachAtom(function (ap: AtomProxy) {
            atomSet.set(ap.index)
          }, filter)
          this.atomSetCache[filtString] = atomSet
          return atomSet
        }
      }
    } else if (filter === false) {
      return new BitArray_Legacy(n)
    }

    return new BitArray_Legacy(n, true)
  }

  /**
   * Get set of atoms around a set of atoms from a filter
   * @param  {Filter} filter - the filter object
   * @param  {Number} radius - radius to filter within
   * @return {BitArray_Legacy} set of atoms
   */
  getAtomSetWithinFilter(filter: boolean | Filter | BitArray_Legacy, radius: number) {
    const spatialHash = this.spatialHash
    const atomSet = this.getAtomSet(false)
    const ap = this.getAtomProxy()

    if (!spatialHash) return atomSet

    this.getAtomSet(filter).forEach(function (idx: number) {
      ap.index = idx
      spatialHash.within(ap.x, ap.y, ap.z, radius).forEach(function (idx2: number) {
        atomSet.set(idx2)
      })
    })

    return atomSet
  }

  /**
   * Get set of atoms around a point
   * @param  {Vector3|AtomProxy} point - the point
   * @param  {Number} radius - radius to filter within
   * @return {BitArray_Legacy} set of atoms
   */
  getAtomSetWithinPoint(point: Vector3 | AtomProxy, radius: number) {
    const p = point
    const atomSet = this.getAtomSet(false)

    if (!this.spatialHash) return atomSet

    this.spatialHash.within(p.x, p.y, p.z, radius).forEach(function (idx: number) {
      atomSet.set(idx)
    })

    return atomSet
  }

  /**
   * Get set of atoms within a volume
   * @param  {Volume} volume - the volume
   * @param  {Number} radius - radius to filter within
   * @param  {[type]} minValue - minimum value to be considered as within the volume
   * @param  {[type]} maxValue - maximum value to be considered as within the volume
   * @param  {[type]} outside - use only values falling outside of the min/max values
   * @return {BitArray_Legacy} set of atoms
   */
  getAtomSetWithinVolume(volume: Volume, radius: number, minValue: number, maxValue: number, outside: boolean) {
    const fv = new FilteredVolume(volume, minValue, maxValue, outside) as any  // TODO

    const dp = fv.getDataPosition()
    const n = dp.length
    const r = fv.matrix.getMaxScaleOnAxis()
    const atomSet = this.getAtomSet(false)

    if (!this.spatialHash) return atomSet

    for (let i = 0; i < n; i += 3) {
      this.spatialHash.within(dp[i], dp[i + 1], dp[i + 2], r).forEach(function (idx) {
        atomSet.set(idx)
      })
    }

    return atomSet
  }

  /**
   * Get set of all atoms within the groups of a filter
   * @param  {Filter} filter - the filter object
   * @return {BitArray_Legacy} set of atoms
   */
  getAtomSetWithinGroup(filter: boolean | Filter) {
    const atomResidueIndex = this.atomStore.residueIndex
    const atomSet = this.getAtomSet(false)
    const rp = this.getResidueProxy()

    this.getAtomSet(filter).forEach(function (idx) {
      rp.index = atomResidueIndex[idx]
      for (let idx2 = rp.atomOffset; idx2 <= rp.atomEnd; ++idx2) {
        atomSet.set(idx2)
      }
    })

    return atomSet
  }

  //

  getFilter(): undefined | Filter {
    return undefined
  }

  getStructure(): Structure | StructureView {
    return this
  }

  /**
   * Entity iterator
   * @param  {function(entity: Entity)} callback - the callback
   * @param  {EntityType} type - entity type
   * @return {undefined}
   */
  eachEntity(callback: (entity: Entity) => void, type: number) {
    this.entityList.forEach(function (entity) {
      if (type === undefined || entity.getEntityType() === type) {
        callback(entity)
      }
    })
  }

  /**
   * Bond iterator
   * @param  {function(bond: BondProxy)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachBond(callback: (entity: BondProxy) => void, filter?: Filter) {
    const bp = this.getBondProxy()
    let bondSet

    if (filter && filter.test) {
      bondSet = this.getBondSet(/*filter*/)
      if (this.bondSet) {
        bondSet.intersection(this.bondSet)
      }
    }

    if (bondSet) {
      bondSet.forEach(function (index) {
        bp.index = index
        callback(bp)
      })
    } else {
      const n = this.bondStore.count
      for (let i = 0; i < n; ++i) {
        bp.index = i
        callback(bp)
      }
    }
  }

  /**
   * Atom iterator
   * @param  {function(atom: AtomProxy)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachAtom(callback: (entity: AtomProxy) => void, filter?: Filter) {
    if (filter && filter.test) {
      this.eachModel(function (mp) {
        mp.eachAtom(callback, filter)
      }, filter)
    } else {
      const an = this.atomStore.count
      const ap = this.getAtomProxy()
      for (let i = 0; i < an; ++i) {
        ap.index = i
        callback(ap)
      }
    }
  }

  /**
   * Residue iterator
   * @param  {function(residue: ResidueProxy)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachResidue(callback: (entity: ResidueProxy) => void, filter?: Filter) {
    if (filter && filter.test) {
      const mn = this.modelStore.count
      const mp = this.getModelProxy()
      const modelOnlyTest = filter.modelOnlyTest
      if (modelOnlyTest) {
        for (let i = 0; i < mn; ++i) {
          mp.index = i
          if (modelOnlyTest(mp)) {
            mp.eachResidue(callback, filter)
          }
        }
      } else {
        for (let i = 0; i < mn; ++i) {
          mp.index = i
          mp.eachResidue(callback, filter)
        }
      }
    } else {
      const rn = this.residueStore.count
      const rp = this.getResidueProxy()
      for (let i = 0; i < rn; ++i) {
        rp.index = i
        callback(rp)
      }
    }
  }

  /**
   * Multi-residue iterator
   * @param {Integer} n - window size
   * @param  {function(residueList: ResidueProxy[])} callback - the callback
   * @return {undefined}
   */
  eachResidueN(n: number, callback: (...entityArray: ResidueProxy[]) => void) {
    const rn = this.residueStore.count
    if (rn < n) return
    const array: ResidueProxy[] = new Array(n)

    for (let i = 0; i < n; ++i) {
      array[i] = this.getResidueProxy(i)
    }
    callback.apply(this, array)

    for (let j = n; j < rn; ++j) {
      for (let i = 0; i < n; ++i) {
        array[i].index += 1
      }
      callback.apply(this, array)
    }
  }

  /**
   * Polymer iterator
   * @param  {function(polymer: Polymer)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachPolymer(callback: (entity: Polymer) => void, filter?: Filter) {
    if (filter && filter.modelOnlyTest) {
      const modelOnlyTest = filter.modelOnlyTest

      this.eachModel(function (mp) {
        if (modelOnlyTest(mp)) {
          mp.eachPolymer(callback, filter)
        }
      })
    } else {
      this.eachModel(function (mp) {
        mp.eachPolymer(callback, filter)
      })
    }
  }

  /**
   * Chain iterator
   * @param  {function(chain: ChainProxy)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachChain(callback: (entity: ChainProxy) => void, filter?: Filter) {
    if (filter && filter.test) {
      this.eachModel(function (mp) {
        mp.eachChain(callback, filter)
      })
    } else {
      const cn = this.chainStore.count
      const cp = this.getChainProxy()
      for (let i = 0; i < cn; ++i) {
        cp.index = i
        callback(cp)
      }
    }
  }

  /**
   * Model iterator
   * @param  {function(model: ModelProxy)} callback - the callback
   * @param  {Filter} [filter] - the filter
   * @return {undefined}
   */
  eachModel(callback: (entity: ModelProxy) => void, filter?: Filter) {
    const n = this.modelStore.count
    const mp = this.getModelProxy()

    if (filter && filter.test) {
      const modelOnlyTest = filter.modelOnlyTest
      if (modelOnlyTest) {
        for (let i = 0; i < n; ++i) {
          mp.index = i
          if (modelOnlyTest(mp)) {
            callback(mp)
          }
        }
      } else {
        for (let i = 0; i < n; ++i) {
          mp.index = i
          callback(mp)
        }
      }
    } else {
      for (let i = 0; i < n; ++i) {
        mp.index = i
        callback(mp)
      }
    }
  }

  //

  getAtomData(params: AtomDataParams) {
    const p = Object.assign({}, params)
    if (p.colorParams) p.colorParams.structure = this.getStructure()

    const what = p.what
    const atomSet = defaults(p.atomSet, this.atomSet)

    let radiusFactory: any  // TODO
    let colormaker: any  // TODO

    const atomData: AtomData = {}
    const ap = this.getAtomProxy()
    const atomCount = atomSet.getSize()

    if (!what || what.position) {
      atomData.position = new Float32Array(atomCount * 3)
    }
    if ((!what || what.color) && p.colorParams) {
      atomData.color = new Float32Array(atomCount * 3)
      colormaker = ColormakerRegistry.getScheme(p.colorParams)
    }
    if (!what || what.picking) {
      atomData.picking = new AtomPicker(new Float32Array(atomCount), this.getStructure())
    }
    if (!what || what.radius) {
      atomData.radius = new Float32Array(atomCount)
      radiusFactory = new RadiusFactory(p.radiusParams as RadiusParams)
    }
    if (!what || what.index) {
      atomData.index = new Uint32Array(atomCount)
    }

    const { position, color, picking, radius, index } = atomData

    atomSet.forEach((idx: number, i: number) => {
      const i3 = i * 3
      ap.index = idx
      if (position) {
        ap.positionToArray(position, i3)
      }
      if (color) {
        colormaker.atomColorToArray(ap, color, i3)
      }
      if (picking) {
        picking.array![i] = idx
      }
      if (radius) {
        radius[i] = radiusFactory.atomRadius(ap)
      }
      if (index) {
        index[i] = idx
      }
    })
    return atomData
  }

  getBondData(params: BondDataParams) {
    const p = Object.assign({}, params)
    if (p.colorParams) p.colorParams.structure = this.getStructure()

    const what = p.what
    const bondSet = defaults(p.bondSet, this.bondSet)
    const multipleBond = defaults(p.multipleBond, 'off')
    const isMulti = multipleBond !== 'off'
    const isOffset = multipleBond === 'offset'
    const bondScale = defaults(p.bondScale, 0.4)
    const bondSpacing = defaults(p.bondSpacing, 1.0)

    let radiusFactory: any  // TODO
    let colormaker: any  // TODO

    const bondData: BondData = {}
    const bp = this.getBondProxy()
    if (p.bondStore) bp.bondStore = p.bondStore
    const ap1 = this.getAtomProxy()
    const ap2 = this.getAtomProxy()

    let bondCount: number
    if (isMulti) {
      const storeBondOrder = bp.bondStore.bondOrder
      bondCount = 0
      bondSet.forEach(function (index: number) {
        bondCount += storeBondOrder[index]
      })
    } else {
      bondCount = bondSet.getSize()
    }

    if (!what || what.position) {
      bondData.position1 = new Float32Array(bondCount * 3)
      bondData.position2 = new Float32Array(bondCount * 3)
    }
    if ((!what || what.color) && p.colorParams) {
      bondData.color = new Float32Array(bondCount * 3)
      bondData.color2 = new Float32Array(bondCount * 3)
      colormaker = ColormakerRegistry.getScheme(p.colorParams)
    }
    if (!what || what.picking) {
      bondData.picking = new BondPicker(new Float32Array(bondCount), this.getStructure(), p.bondStore!) as any
    }
    if (!what || what.radius || (isMulti && what.position)) {
      radiusFactory = new RadiusFactory(p.radiusParams as RadiusParams)
    }
    if (!what || what.radius) {
      bondData.radius = new Float32Array(bondCount)
      if (p.radius2) {
        bondData.radius2 = new Float32Array(bondCount)
      }
    }

    const { position1, position2, color, color2, picking, radius, radius2 } = bondData

    let i = 0
    let j, i3, k, bondOrder, absOffset
    let multiRadius

    const vt = new Vector3()
    const vShortening = new Vector3()
    const vShift = new Vector3()

    bondSet.forEach((index: number) => {
      i3 = i * 3
      bp.index = index
      ap1.index = bp.atomIndex1
      ap2.index = bp.atomIndex2
      bondOrder = bp.bondOrder
      if (position1) {
        if (isMulti && bondOrder > 1) {
          const atomRadius = radiusFactory.atomRadius(ap1)
          multiRadius = atomRadius * bondScale / (0.5 * bondOrder)

          bp.calculateShiftDir(vShift)

          if (isOffset) {
            absOffset = 2 * bondSpacing * atomRadius
            vShift.multiplyScalar(absOffset)
            vShift.negate()

            // Shortening is calculated so that neighbouring double
            // bonds on tetrahedral geometry (e.g. sulphonamide)
            // are not quite touching (arccos(1.9 / 2) ~ 109deg)
            // but don't shorten beyond 10% each end or it looks odd
            vShortening.subVectors(ap2 as any, ap1 as any).multiplyScalar(  // TODO
              Math.max(0.1, absOffset / 1.88)
            )
            ap1.positionToArray(position1, i3)
            ap2.positionToArray(position2, i3)

            if (bondOrder >= 2) {
              vt.addVectors(ap1 as any, vShift).add(vShortening).toArray(position1 as any, i3 + 3)  // TODO
              vt.addVectors(ap2 as any, vShift).sub(vShortening).toArray(position2 as any, i3 + 3)  // TODO

              if (bondOrder >= 3) {
                vt.subVectors(ap1 as any, vShift).add(vShortening).toArray(position1 as any, i3 + 6)  // TODO
                vt.subVectors(ap2 as any, vShift).sub(vShortening).toArray(position2 as any, i3 + 6)  // TODO
              }
            }
          } else {
            absOffset = (bondSpacing - bondScale) * atomRadius
            vShift.multiplyScalar(absOffset)

            if (bondOrder === 2) {
              vt.addVectors(ap1 as any, vShift).toArray(position1 as any, i3)  // TODO
              vt.subVectors(ap1 as any, vShift).toArray(position1 as any, i3 + 3)  // TODO
              vt.addVectors(ap2 as any, vShift).toArray(position2 as any, i3)  // TODO
              vt.subVectors(ap2 as any, vShift).toArray(position2 as any, i3 + 3)  // TODO
            } else if (bondOrder === 3) {
              ap1.positionToArray(position1, i3)
              vt.addVectors(ap1 as any, vShift).toArray(position1 as any, i3 + 3)  // TODO
              vt.subVectors(ap1 as any, vShift).toArray(position1 as any, i3 + 6)  // TODO
              ap2.positionToArray(position2, i3)
              vt.addVectors(ap2 as any, vShift).toArray(position2 as any, i3 + 3)  // TODO
              vt.subVectors(ap2 as any, vShift).toArray(position2 as any, i3 + 6)  // TODO
            } else {
              // todo, better fallback
              ap1.positionToArray(position1, i3)
              ap2.positionToArray(position2, i3)
            }
          }
        } else {
          ap1.positionToArray(position1, i3)
          ap2.positionToArray(position2, i3)
        }
      }
      if (color && color2) {
        colormaker.bondColorToArray(bp, 1, color, i3)
        colormaker.bondColorToArray(bp, 0, color2, i3)
        if (isMulti && bondOrder > 1) {
          for (j = 1; j < bondOrder; ++j) {
            k = j * 3 + i3
            copyWithin(color, i3, k, 3)
            copyWithin(color2, i3, k, 3)
          }
        }
      }
      if (picking && picking.array) {
        picking.array[i] = index
        if (isMulti && bondOrder > 1) {
          for (j = 1; j < bondOrder; ++j) {
            picking.array[i + j] = index
          }
        }
      }
      if (radius) {
        radius[i] = radiusFactory.atomRadius(ap1)
        if (isMulti && bondOrder > 1) {
          multiRadius = radius[i] * bondScale / (isOffset ? 1 : (0.5 * bondOrder))
          for (j = isOffset ? 1 : 0; j < bondOrder; ++j) {
            radius[i + j] = multiRadius
          }
        }
      }
      if (radius2) {
        radius2[i] = radiusFactory.atomRadius(ap2)
        if (isMulti && bondOrder > 1) {
          multiRadius = radius2[i] * bondScale / (isOffset ? 1 : (0.5 * bondOrder))
          for (j = isOffset ? 1 : 0; j < bondOrder; ++j) {
            radius2[i + j] = multiRadius
          }
        }
      }
      i += isMulti ? bondOrder : 1
    })

    return bondData
  }

  getBackboneAtomData(params: AtomDataParams) {
    params = Object.assign({
      atomSet: this.atomSetCache.__backbone
    }, params)

    return this.getAtomData(params)
  }

  getBackboneBondData(params: BondDataParams) {
    params = Object.assign({
      bondSet: this.getBackboneBondSet(),
      bondStore: this.backboneBondStore
    }, params)

    return this.getBondData(params)
  }

  getRungAtomData(params: AtomDataParams) {
    params = Object.assign({
      atomSet: this.atomSetCache.__rung
    }, params)

    return this.getAtomData(params)
  }

  getRungBondData(params: BondDataParams) {
    params = Object.assign({
      bondSet: this.getRungBondSet(),
      bondStore: this.rungBondStore
    }, params)

    return this.getBondData(params)
  }

  //

  /**
   * Gets the bounding box of the (filtered) structure atoms
   * @param  {Filter} [filter] - the filter
   * @param  {Box3} [box] - optional target
   * @return {Vector3} the box
   */
  getBoundingBox(filter?: Filter, box?: Box3) {
    if (Debug) Log.time('getBoundingBox')

    box = box || new Box3()

    let minX = +Infinity
    let minY = +Infinity
    let minZ = +Infinity

    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    this.eachAtom(ap => {
      const x = ap.x
      const y = ap.y
      const z = ap.z

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z

      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }, filter)

    box.min.set(minX, minY, minZ)
    box.max.set(maxX, maxY, maxZ)

    if (Debug) Log.timeEnd('getBoundingBox')

    return box
  }

  /**
   * Gets the principal axes of the (filtered) structure atoms
   * @param  {Filter} [filter] - the filter
   * @return {PrincipalAxes} the principal axes
   */
  getPrincipalAxes(filter?: Filter) {
    if (Debug) Log.time('getPrincipalAxes')

    let i = 0
    const coords = new Matrix(3, this.atomCount)
    const cd = coords.data

    this.eachAtom(a => {
      cd[i + 0] = a.x
      cd[i + 1] = a.y
      cd[i + 2] = a.z
      i += 3
    }, filter)

    if (Debug) Log.timeEnd('getPrincipalAxes')

    return new PrincipalAxes(coords)
  }

  /**
   * Gets the center of the (filtered) structure atoms
   * @param  {Filter} [filter] - the filter
   * @return {Vector3} the center
   */
  atomCenter(filter?: Filter) {
    if (filter) {
      return this.getBoundingBox(filter).getCenter(new Vector3())
    } else {
      return this.center.clone()
    }
  }

  hasCoords() {
    if (this._hasCoords === undefined) {
      const atomStore = this.atomStore
      this._hasCoords = (
        arrayMin(atomStore.x) !== 0 || arrayMax(atomStore.x) !== 0 ||
        arrayMin(atomStore.y) !== 0 || arrayMax(atomStore.y) !== 0 ||
        arrayMin(atomStore.z) !== 0 || arrayMax(atomStore.z) !== 0
      ) || (
          // allow models with a single atom at the origin
          atomStore.count / this.modelStore.count === 1
        )
    }
    return this._hasCoords;
  }

  getSequence(filter?: Filter) {
    return this.getSequenceFormatted(rp => rp.getResname1(), filter);
  }

  getSequenceFormatted(convFunc: (rp: ResidueProxy) => string, filter?: Filter) {
    const seq: string[] = [];
    const rp = this.getResidueProxy();

    this.eachAtom(function (ap: AtomProxy) {
      rp.index = ap.residueIndex;
      if (ap.index === rp.traceAtomIndex) {
        seq.push(convFunc(rp));
      }
    }, filter)

    return seq;
  }

  getAtomIndices(filter?: Filter) {
    if (filter && filter.string) {
      const indices: number[] = []
      this.eachAtom(function (ap: AtomProxy) {
        indices.push(ap.index)
      }, filter)
      return new Uint32Array(indices)
    } else {
      const p = { what: { index: true } }
      return this.getAtomData(p).index
    }
  }

  /**
   * Get number of unique chainnames
   * @param  {Filter} filter - limit count to filter
   * @return {Integer} count
   */
  getChainnameCount(filter?: Filter) {
    const chainnames = new Set()
    this.eachChain(function (cp: ChainProxy) {
      if (cp.residueCount) {
        chainnames.add(cp.chainname)
      }
    }, filter)

    return chainnames.size
  }

  //

  updatePosition(position: Float32Array | number[]) {
    let i = 0

    this.eachAtom(function (ap: AtomProxy) {
      ap.positionFromArray(position, i)
      i += 3
    }, undefined)

    this._hasCoords = undefined  // to trigger recalculation
  }

  refreshPosition() {
    this.getBoundingBox(undefined, this.boundingBox)
    this.boundingBox.getCenter(this.center)
    this.spatialHash = new SpatialHash(this.atomStore, this.boundingBox)
  }

  /**
   * Calls dispose() method of property objects.
   * Unsets properties to help garbage collection.
   * @return {undefined}
   */
  dispose() {
    if (this.frames) this.frames.length = 0
    if (this.boxes) this.boxes.length = 0

    this.bondStore?.dispose()
    this.backboneBondStore?.dispose()
    this.rungBondStore?.dispose()
    this.atomStore?.dispose()
    this.residueStore?.dispose()
    this.chainStore?.dispose()
    this.modelStore?.dispose()

    delete this.bondStore
    delete this.atomStore
    delete this.residueStore
    delete this.chainStore
    delete this.modelStore

    delete this.frames
    delete this.boxes

    delete this.bondSet
    delete this.atomSet
  }

  //
  // CATANA modifications
  //

  /**
   * Creates a copy of this structure.
   * 
   * @returns new structure being a copy of this one
   */
  public clone(): Structure {
    return duplicateStructure(this);
  }

  /**
   * Returns a string containing some information about the structure
   * 
   * @returns string with information about the structure
  */
  public toString(): string {
    let res = "";

    res += "Total model records: " + this.modelStore.count + "\n";
    res += "Total chain records: " + this.chainStore.count + "\n";
    res += "Total residue records: " + this.residueStore.count + "\n";
    res += "Total atom records: " + this.atomStore.count + "\n";
    res += "\nComponent details:\n";
    this.eachChain(cp => {
      res += "- " + (cp.entity?.isPolymer() ? "polymer" : (cp.entity?.isWater() ? "water" : "")) +
        " chain " + cp.chainname + " with " + cp.residueCount
        + " residues and " + cp.atomCount + " atoms.\n";
    });

    return res;
  }

  /**
   * Removes given number of atoms starting at provided index
   * 
   * @param atomIdx index to start at (refers to the location in atom store)
   * @param count number of atoms to remove
   */
  public removeAtomsStartingAtIndex(atomIdx: number, count: number = 1): void {
    const atomStore = this.atomStore;
    const bondStore = this.bondStore;
    const rungBondStore = this.rungBondStore;
    const backboneBondStore = this.backboneBondStore;
    const resStore = this.residueStore;

    count = Math.max(0, Math.min(this.atomCount - atomIdx, count));
    const endIdx = atomIdx + count - 1;

    // Update residues' atoms counts
    for (let i = atomIdx; i <= endIdx; ++i) {
      --resStore.atomCount[atomStore.residueIndex[i]];
    }

    // Modify type ID references
    for (let i = atomIdx; i <= endIdx; ++i) {
      const aTypeId = atomStore.atomTypeId[i];
      this.atomMap.remove(aTypeId);

      const rTypeId = resStore.residueTypeId[atomStore.residueIndex[i]];
      const currResType = this.residueMap.get(rTypeId);

      let atidOccurrence = 0;
      for (let j = 0; j < currResType.atomTypeIdList.length; ++j) {
        if (currResType.atomTypeIdList[j] === aTypeId) {
          ++atidOccurrence;

          if (atidOccurrence > 1) {
            break;
          }
        }
      }

      if (atidOccurrence === 1) {
        const newResType = this.residueMap.add(currResType.resname,
          currResType.atomTypeIdList.filter(aid => aid !== aTypeId), currResType.hetero === 1, currResType.chemCompType
        );

        this.residueMap.remove(rTypeId); // Previous record can be removed ...
        resStore.residueTypeId[atomStore.residueIndex[i]] = newResType; // ... and replaced with updated one

      }
    }


    // Shift subsequent atoms
    for (let i = endIdx + 1; i < this.atomCount; ++i) {
      atomStore.residueIndex[i - count] = atomStore.residueIndex[i];
      atomStore.atomTypeId[i - count] = atomStore.atomTypeId[i];
      atomStore.x[i - count] = atomStore.x[i];
      atomStore.y[i - count] = atomStore.y[i];
      atomStore.z[i - count] = atomStore.z[i];
      atomStore.serial[i - count] = atomStore.serial[i] - count;
      atomStore.bfactor[i - count] = atomStore.bfactor[i];
      atomStore.altloc[i - count] = atomStore.altloc[i];
      atomStore.occupancy[i - count] = atomStore.occupancy[i];

      if (atomStore.partialCharge) {
        atomStore.partialCharge[i - count] = atomStore.partialCharge[i];
      }

      if (atomStore.formalCharge) {
        atomStore.formalCharge[i - count] = atomStore.formalCharge[i];
      }
    }

    atomStore.count -= count;
    atomStore.shrinkToFit();

    const removeExistingBonds = (currBondStore: BondStore) => {
      // Remove bonds referencing removed atoms and update bond indices
      const bondRemFlags = new BitArray_Legacy(currBondStore.count);

      for (let i = 0; i < currBondStore.count; ++i) {
        if ((currBondStore.atomIndex1[i] >= atomIdx && currBondStore.atomIndex1[i] <= endIdx) ||
          (currBondStore.atomIndex2[i] >= atomIdx && currBondStore.atomIndex2[i] <= endIdx)) {
          bondRemFlags.set(i);
        }

        if (currBondStore.atomIndex1[i] > endIdx) {
          currBondStore.atomIndex1[i] -= count;
        }

        if (currBondStore.atomIndex2[i] > endIdx) {
          currBondStore.atomIndex2[i] -= count;
        }
      }

      // There seems to be no "normal" way to remove a single element from
      // Uint32Array so I use a combination of bit array and filter function
      const filterFunc = (element: any, idx: number, array: any) => {
        return idx < bondRemFlags.length && !bondRemFlags.isSet(idx);
      };

      currBondStore.atomIndex1 = currBondStore.atomIndex1.filter(filterFunc);
      currBondStore.atomIndex2 = currBondStore.atomIndex2.filter(filterFunc);
      currBondStore.bondOrder = currBondStore.bondOrder.filter(filterFunc);

      currBondStore.count = currBondStore.atomIndex1.length;
      currBondStore.shrinkToFit();
    }

    removeExistingBonds(bondStore);
    removeExistingBonds(backboneBondStore);
    removeExistingBonds(rungBondStore);

    // Update residue offsets
    for (let i = 0; i < resStore.count; ++i) {
      if (resStore.atomOffset[i] >= atomIdx) {
        resStore.atomOffset[i] -= Math.min(count, resStore.atomOffset[i] - atomIdx);
      }
    }

    // Remove empty residues
    for (let i = resStore.count - 1; i >= 0; --i) {
      if (resStore.atomCount[i] <= 0) {
        this.removeResidueReferences(i);
      }
    }

    this.atomSetCache = {};
    this.atomSetDict = {};

    calculateBondsBetween(this, true, true);
    calculateBondsWithin(this, true);

    this.finalizeAtoms();
    this.finalizeBonds();

    this.signals.refreshed.dispatch();
  }

  /**
   * Removes provided atom
   * 
   * @param atom atom to remove
   */
  public removeAtom(atom: AtomProxy): void {
    this.removeAtomsStartingAtIndex(atom.index, 1);
  }

  /**
   * Removes **first** atom meeting the given condition.
   * The additional parameters determine the subset of atoms to check.
   * If startIdx and count are less than zero, all atoms are checked for predicate.
   * 
   * @param predicate predicate that evaluates to true for the atom to be removed
   * @param startIdx start index of the interval to search through
   * @param count length of the interval
   */
  public removeAtomWhere(predicate: (a: AtomProxy) => boolean, startIdx: number = -1, count: number = -1): void {
    return this.removeAtomsWherePredicate(predicate, startIdx, count, true);
  }

  /**
  * Removes *all* atoms meeting the given condition.
  * The additional parameters determine the subset of atoms to check.
  * If startIdx and count are less than zero, all atoms are checked for predicate.
  * 
  * @param predicate predicate that evaluates to true for atoms to be removed
  * @param startIdx start index of the interval to search through
  * @param count length of the interval
  */
  public removeAtomsWhere(predicate: (a: AtomProxy) => boolean, startIdx: number = -1, count: number = -1): void {
    return this.removeAtomsWherePredicate(predicate, startIdx, count, false);
  }

  /**
   * Removes atoms corresponding to the provided chemical element.
   * 
   * @example
   * structure.removeElements("H") // removes all hydrogen atoms
   * 
   * @param element element name to remove
   */
  public removeElements(element: string): void {
    for (let i = this.atomStore.count - 1; i >= 0; --i) {
      const aType = this.atomMap.get(this.atomStore.atomTypeId[i]);
      if (aType !== undefined && aType.element === element) {
        this.removeAtomsStartingAtIndex(i, 1);
      }
    }
  }


  /**
   * Removes given residue from the structure.
   * The chain is not affected by the removal, i.e., the function does not handle
   * any potential "discontinuity" that might be caused by this operation.
   * 
   * @param residue residue to be removed
   */
  public removeResidue(residue: ResidueProxy): void {
    // TODO Removing a residue may split the chain in two disconnected parts in reality. This method ignores that now.
    //      Should this method handle this, i.e., cut the old one and create a new one with the second part?
    if (residue.atomCount > 0) {
      this.removeAtomsStartingAtIndex(residue.atomOffset, residue.atomCount);
    } else {
      this.removeResidueReferences(residue.index);
    }
  }

  /**
   * Removes given chain from the structure.
   *  
   * @param chain chain to be removed
   */
  public removeChain(chain: ChainProxy): void {
    if (chain.atomCount > 0) {
      this.removeAtomsStartingAtIndex(chain.atomOffset, chain.atomCount);
    } else {
      this.removeChainReferences(chain.index);
    }
  }

  private removeAtomsWherePredicate(predicate: (a: AtomProxy) => boolean, startIdx: number = -1,
    atomsToCheckCount: number = -1, removeOnlyFirst: boolean): void {
    const start = Math.max(0, Math.min(startIdx, this.atomStore.count - 1));
    const end = atomsToCheckCount < 0 ? this.atomStore.count - 1 : Math.min(start + atomsToCheckCount - 1, this.atomStore.count - 1);
    const ap = this.getAtomProxy();

    for (let i = end; i >= 0; --i) {
      ap.index = i;
      if (predicate(ap)) {
        this.removeAtom(ap);
        if (removeOnlyFirst) {
          break;
        }
      }
    }
  }

  // Precondition: residue has no atoms
  private removeResidueReferences(residueIdx: number): void {
    const atomStore = this.atomStore;
    const resStore = this.residueStore;
    const chainStore = this.chainStore;

    --chainStore.residueCount[resStore.chainIndex[residueIdx]];

    const remResCi = resStore.chainIndex[residueIdx];
    const remResRno = resStore.resno[residueIdx];

    this.residueMap.remove(resStore.residueTypeId[residueIdx]);

    // Shift residue data
    for (let i = residueIdx + 1; i < resStore.count; ++i) {
      resStore.chainIndex[i - 1] = resStore.chainIndex[i];
      resStore.atomOffset[i - 1] = resStore.atomOffset[i];
      resStore.atomCount[i - 1] = resStore.atomCount[i];
      resStore.residueTypeId[i - 1] = resStore.residueTypeId[i];
      resStore.sstruc[i - 1] = resStore.sstruc[i];
      resStore.inscode[i - 1] = resStore.inscode[i];
      resStore.resno[i - 1] =
        remResCi === resStore.chainIndex[i] && remResRno < resStore.resno[i] ?
          resStore.resno[i] - 1 :
          resStore.resno[i];
    }

    --resStore.count;

    // Modify atoms' residue indices
    for (let i = 0; i < atomStore.count; ++i) {
      if (atomStore.residueIndex[i] >= residueIdx) {
        --atomStore.residueIndex[i];
      }
    }

    // Modify chain offsets
    for (let i = 0; i < chainStore.count; ++i) {
      if (chainStore.residueOffset[i] > residueIdx) {
        --chainStore.residueOffset[i];
      }
    }

    // Remove empty chains
    for (let i = chainStore.count - 1; i >= 0; --i) {
      if (chainStore.residueCount[i] <= 0) {
        this.removeChainReferences(i);
      }
    }
  }

  private removeChainReferences(chainIdx: number): void {
    const residueStore = this.residueStore;
    const chainStore = this.chainStore;
    const modelStore = this.modelStore;

    // Update biological assembly data
    if (this.biomolDict.BU1) {
      if (this.biomolDict.BU1.partList.length > 0) {
        const chainBioMolIdx = this.biomolDict.BU1.partList[0].chainList.indexOf(chainStore.getChainname(chainIdx));
        if (chainBioMolIdx >= 0) {
          this.biomolDict.BU1.partList[0].chainList.splice(chainBioMolIdx, 1);
        }
      }
    }

    // Update stores
    --modelStore.chainCount[chainStore.modelIndex[chainIdx]];

    for (let i = chainIdx + 1; i < chainStore.count; ++i) {
      chainStore.entityIndex[i - 1] = chainStore.entityIndex[i];
      chainStore.modelIndex[i - 1] = chainStore.modelIndex[i];
      chainStore.residueOffset[i - 1] = chainStore.residueOffset[i];
      chainStore.residueCount[i - 1] = chainStore.residueCount[i];

      chainStore.setChainname(i - 1, chainStore.getChainname(i));
      chainStore.setChainid(i - 1, chainStore.getChainid(i));
    }

    --chainStore.count;

    for (let i = 0; i < modelStore.count; ++i) {
      if (modelStore.chainOffset[i] > chainIdx) {
        --modelStore.chainOffset[i];
      }
    }

    // Shift residues references accordingly
    for (let i = 0; i < residueStore.count; ++i) {
      if (residueStore.chainIndex[i] >= chainIdx) {
        --residueStore.chainIndex[i];
      }
    }

    // TODO Update assembly information?
    // TODO Model store may need to be updated as well if the model is empty
  }

  private forEachStore(callback: (s: Store) => void) {
    callback(this.atomStore);
    callback(this.bondStore);
    callback(this.backboneBondStore);
    callback(this.rungBondStore);
    callback(this.residueStore);
    callback(this.chainStore);
    callback(this.modelStore);
  }

  private forEachSet(callback: (s: BitArray_Legacy) => void) {
    if (this.atomSet) callback(this.atomSet);
    if (this.bondSet) callback(this.bondSet);
  }

  public get estimatedSizeInBytes(): number {
    let size: number = 0;
    this.forEachStore(s => {
      size += s.estimatedSizeInBytes;
    });
    this.forEachSet(s => {
      size += s.estimatedSizeInBytes;
    })
    return size;
  }
}

export default Structure
