/**
 * @file Structure View
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Vector3, Box3 } from 'three'

import { Debug, Log } from '../globals'
import Structure from './structure'
import Filter from '../filtering/filter'
import BitArray_Legacy from '../utils/bitarray'

import BondProxy from '../proxy/bond-proxy'
import AtomProxy from '../proxy/atom-proxy'
import ResidueProxy from '../proxy/residue-proxy'
import ChainProxy from '../proxy/chain-proxy'
import ModelProxy from '../proxy/model-proxy'
import SpatialHash from '../geometry/spatial-hash';
import BondHash from '../store/bond-hash';
import ResidueMap from '../store/residue-map';
import AtomMap from '../store/atom-map';
import ModelStore from '../store/model-store';
import ChainStore from '../store/chain-store';
import ResidueStore from '../store/residue-store';
import AtomStore from '../store/atom-store';
import BondStore from '../store/bond-store';
import Validation from './validation';
import Unitcell from '../symmetry/unitcell';
import Entity from './entity';
import Assembly from '../symmetry/assembly';
import { Data } from './data';

/**
 * Get view on structure restricted to the filter
 * @param  {Filter} filter - the filter
 * @return {StructureView} the view on the structure
 */
Structure.prototype.getView = function (this: Structure, filter: Filter) {
  // added here to avoid cyclic import dependency
  return new StructureView(this, filter)
}

/**
 * View on the structure, restricted to the filter
 */
class StructureView extends Structure {
  structure: Structure
  filter: Filter

  /**
   * @param {Structure} structure - the structure
   * @param {Filter} filter - the filter
   */
  constructor (structure: Structure, filter: Filter) {
    super()

    this.structure = structure
    this.filter = filter

    this.center = new Vector3()
    this.boundingBox = new Box3()

    this._bp = this.getBondProxy()
    this._ap = this.getAtomProxy()
    this._rp = this.getResidueProxy()
    this._cp = this.getChainProxy()

    if (this.filter) {
      this.filter.signals.stringChanged.add(this.refresh, this)
    }

    this.structure.signals.refreshed.add(this.refresh, this)

    this.refresh()
  }

  init () {}

  get type () { return 'StructureView' }

  get name () { return this.structure.name }
  get path () { return this.structure.path }
  get title () { return this.structure.title }
  get id () { return this.structure.id }
  get data (): Data { return this.structure.data }
  get atomSetDict () { return this.structure.atomSetDict }
  get biomolDict (): {[k: string]: Assembly} { return this.structure.biomolDict }
  get entityList (): Entity[] { return this.structure.entityList }
  get unitcell (): Unitcell|undefined { return this.structure.unitcell }
  get frames () { return this.structure.frames }
  get boxes () { return this.structure.boxes }
  get validation (): Validation|undefined { return this.structure.validation }
  get bondStore () { return this.structure.bondStore }
  get backboneBondStore () { return this.structure.backboneBondStore }
  get rungBondStore (): BondStore { return this.structure.rungBondStore }
  get atomStore (): AtomStore { return this.structure.atomStore }
  get residueStore (): ResidueStore { return this.structure.residueStore }
  get chainStore (): ChainStore { return this.structure.chainStore }
  get modelStore (): ModelStore { return this.structure.modelStore }
  get atomMap (): AtomMap { return this.structure.atomMap }
  get residueMap (): ResidueMap { return this.structure.residueMap }
  get bondHash (): BondHash|undefined { return this.structure.bondHash }
  get spatialHash (): SpatialHash|undefined { return this.structure.spatialHash }

  get _hasCoords () { return this.structure._hasCoords }
  set _hasCoords (value) { this.structure._hasCoords = value }

  /**
   * Updates atomSet, bondSet, atomSetCache, atomCount, bondCount, boundingBox, center.
   * @emits {Structure.signals.refreshed} when refreshed
   * @return {undefined}
   */
  refresh () {
    if (Debug) Log.time('StructureView.refresh')

    this.atomSetCache = {}
    const structure = this.structure

    if (this.filter.isAllFilter() &&
        structure !== this && structure.atomSet && structure.bondSet
    ) {
      this.atomSet = structure.atomSet.clone()
      this.bondSet = structure.bondSet.clone()

      for (let name in this.atomSetDict) {
        const atomSet = this.atomSetDict[ name ]
        this.atomSetCache[ '__' + name ] = atomSet.clone()
      }

      this.atomCount = structure.atomCount
      this.bondCount = structure.bondCount

      this.boundingBox.copy(structure.boundingBox)
      this.center.copy(structure.center)
    } else if (this.filter.isNoneFilter() &&
        structure !== this && structure.atomSet && structure.bondSet
    ) {
      this.atomSet = new BitArray_Legacy(structure.atomCount)
      this.bondSet = new BitArray_Legacy(structure.bondCount)

      for (let name in this.atomSetDict) {
        this.atomSetCache[ '__' + name ] = new BitArray_Legacy(structure.atomCount)
      }

      this.atomCount = 0
      this.bondCount = 0

      this.boundingBox.makeEmpty()
      this.center.set(0, 0, 0)
    } else {
      this.atomSet = this.getAtomSet(this.filter, true)
      if (structure.atomSet) {
        this.atomSet = this.atomSet.intersection(structure.atomSet)
      }

      this.bondSet = this.getBondSet()

      for (let name in this.atomSetDict) {
        const atomSet = this.atomSetDict[ name ]
        this.atomSetCache[ '__' + name ] = atomSet.makeIntersection(this.atomSet)
      }

      this.atomCount = this.atomSet.getSize()
      this.bondCount = this.bondSet.getSize()

      this.boundingBox = this.getBoundingBox()
      this.center = this.boundingBox.getCenter(new Vector3())
    }

    if (Debug) Log.timeEnd('StructureView.refresh')

    this.signals.refreshed.dispatch()
  }

  //

  setFilter (filter: Filter) {
    this.filter = filter

    this.refresh()
  }

  getFilter (filter?: Filter) {
    const filtList: string[] = []

    if (filter && filter.string) {
      filtList.push(filter.string)
    }

    const parentFilter = this.structure.getFilter()
    if (parentFilter && parentFilter.string) {
      filtList.push(parentFilter.string)
    }

    if (this.filter && this.filter.string) {
      filtList.push(this.filter.string)
    }

    let filt = ''
    if (filtList.length > 0) {
      filt = `( ${filtList.join(' ) AND ( ')} )`
    }

    return new Filter(filt)
  }

  getStructure () {
    return this.structure.getStructure()
  }

  //

  eachBond (callback: (entity: BondProxy) => any, filter?: Filter) {
    this.structure.eachBond(callback, this.getFilter(filter))
  }

  eachAtom (callback: (entity: AtomProxy) => any, filter?: Filter) {
    const ap = this.getAtomProxy()
    const atomSet = this.getAtomSet(filter)
    const n = this.atomStore.count

    if (atomSet.getSize() < n) {
      atomSet.forEach(function (index) {
        ap.index = index
        callback(ap)
      })
    } else {
      for (let i = 0; i < n; ++i) {
        ap.index = i
        callback(ap)
      }
    }
  }

  eachResidue (callback: (entity: ResidueProxy) => any, filter?: Filter) {
    this.structure.eachResidue(callback, this.getFilter(filter))
  }

  /**
   * Not implemented
   * @alias StructureView#eachResidueN
   * @return {undefined}
   */
  eachResidueN (n: number, callback: (entity: ResidueProxy) => any) {
    console.error('StructureView.eachResidueN() not implemented')
  }

  eachChain (callback: (entity: ChainProxy) => any, filter?: Filter) {
    this.structure.eachChain(callback, this.getFilter(filter))
  }

  eachModel (callback: (entity: ModelProxy) => any, filter?: Filter) {
    this.structure.eachModel(callback, this.getFilter(filter))
  }

    //

  getAtomSet (filter?: boolean|Filter|BitArray_Legacy, ignoreView = false) {
    let atomSet = this.structure.getAtomSet(filter)
    if (!ignoreView && this.atomSet) {
      atomSet = atomSet.makeIntersection(this.atomSet)
    }

    return atomSet
  }

  //

  getAtomIndices (filter?: Filter) {
    return this.structure.getAtomIndices(this.getFilter(filter))
  }

  refreshPosition () {
    return this.structure.refreshPosition()
  }

  //

  dispose () {
    if (this.filter) {
      this.filter.signals.stringChanged.remove(this.refresh, this)
    }

    this.structure.signals.refreshed.remove(this.refresh, this)

    delete this.structure

    delete this.atomSet
    delete this.bondSet

    delete this.atomCount
    delete this.bondCount
  }
}

export default StructureView
