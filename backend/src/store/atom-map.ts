/**
 * @file Atom Map
 * @author Alexander Rose <alexander.rose@weirdbyte.de>, modified by David Kutak
 * @private
 */

import AtomType from './atom-type'
import { guessElement } from '../structure/structure-utils'
import Structure from '../structure/structure'

function getHash(atomname: string, element: string) {
  return atomname + '|' + element
}

class AtomMap {
  private hashToIdDict: { [k: string]: number } = {};
  private idToTypeDict: { [k: number]: AtomType } = {};
  private idCounter: number = 0;

  constructor(private readonly structure: Structure) { }

  public add(atomname: string, element?: string): number {
    atomname = atomname.toUpperCase();
    if (!element) {
      element = guessElement(atomname);
    } else {
      element = element.toUpperCase();
    }

    const hash = getHash(atomname, element);
    let id = this.hashToIdDict[hash];
    if (id === undefined) {
      const atomType = new AtomType(this.structure, atomname, element);
      id = this.idCounter++;
      this.hashToIdDict[hash] = id;
      this.idToTypeDict[id] = atomType;
    }

    return id;
  }

  public remove(id: number): boolean {
    // The same comment as in ResidueMap.remove() applies

    let shouldDelete: boolean = true;
    let occurrences: number = 0;

    for (let i = 0; i < this.structure.atomStore.count; ++i) {
      if (this.structure.atomStore.atomTypeId[i] === id) {
        ++occurrences;

        if (occurrences > 1) {
          shouldDelete = false;
          break;
        }
      }
    }

    if (shouldDelete) {
      const at = this.idToTypeDict[id];
      delete this.hashToIdDict[getHash(at.atomname, at.element)];
      delete this.idToTypeDict[id];
    }

    return shouldDelete;
  }

  public get(id: number): AtomType {
    return this.idToTypeDict[id];
  }

  public get count() : number {
    return Object.keys(this.idToTypeDict).length;
  }
}

export default AtomMap
