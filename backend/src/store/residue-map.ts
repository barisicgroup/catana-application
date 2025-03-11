/**
 * @file Residue Map
 * @author Alexander Rose <alexander.rose@weirdbyte.de>, modified by David Kutak
 * @private
 */

import Structure from '../structure/structure'
import { ResidueBonds } from '../structure/structure-utils'
import ResidueType from './residue-type'

function getHash(resname: string, atomTypeIdList: number[], hetero: boolean, chemCompType = '') {
  return (
    resname + '|' +
    atomTypeIdList.join(',') + '|' +
    (hetero ? 1 : 0) + '|' +
    chemCompType
  )
}

class ResidueMap {
  private hashToIdDict: { [k: string]: number } = {};
  private idToTypeDict: { [k: number]: ResidueType } = {};
  private idCounter: number = 0;

  constructor(private readonly structure: Structure) { }

  add(resname: string, atomTypeIdList: number[], hetero: boolean, chemCompType = '', bonds?: ResidueBonds): number {
    resname = resname.toUpperCase();
    const hash = getHash(resname, atomTypeIdList, hetero, chemCompType);
    let id = this.hashToIdDict[hash];

    if (id === undefined) {
      const residueType = new ResidueType(
        this.structure, resname, atomTypeIdList, hetero, chemCompType, bonds
      );
      id = this.idCounter++;
      this.hashToIdDict[hash] = id;
      this.idToTypeDict[id] = residueType;
    }

    return id;
  }

  remove(id: number): boolean {
    // Looping through whole array is far from being performance-effective or elegant.
    // More optimized solutions were, however, hard to maintain due to the possibility of using this class in a way
    // where the IDs might be simply copied without letting this class know.

    let shouldDelete: boolean = true;
    let occurrences: number = 0;

    for (let i = 0; i < this.structure.residueStore.count; ++i) {
      if (this.structure.residueStore.residueTypeId[i] === id) {
        ++occurrences;

        if (occurrences > 1) {
          shouldDelete = false;
          break;
        }
      }
    }

    if (shouldDelete) {
      const rt = this.idToTypeDict[id];
      delete this.hashToIdDict[getHash(rt.resname, rt.atomTypeIdList, rt.hetero === 1, rt.chemCompType)];
      delete this.idToTypeDict[id];
    }

    return shouldDelete;
  }

  get(id: number): ResidueType {
    return this.idToTypeDict[id];
  }

  public get count() : number {
    return Object.keys(this.idToTypeDict).length;
  }
}

export default ResidueMap
