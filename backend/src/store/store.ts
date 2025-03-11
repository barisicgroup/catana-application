/**
 * @file Store
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Log } from '../globals'
import { getTypedArray, TypedArrayString } from '../utils'

export type StoreField = [string, number, TypedArrayString]

/**
 * Store base class
 * @interface
 */
export default class Store {
  [k: string]: any

  length: number
  count: number

  _fields: StoreField[]

  get _defaultFields(): StoreField[] {
    return [];
  }

  /**
   * @param {Integer} [size] - initial size
   */
  constructor(size = 0) {
    this._fields = this._defaultFields
    this._init(size); // Catana modification (_init() was previously always being called with 0 instead of 'size')
  }

  /**
   * Initialize the store
   * @param  {Integer} size - size to initialize
   * @return {undefined}
   */
  _init(size: number) {
    this.length = size
    this.count = 0

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const [name, size, type]: StoreField = this._fields[i]
      this._initField(name, size, type)
    }
  }

  /**
   * Initialize a field
   * @param  {String} name - field name
   * @param  {Integer} size - element size
   * @param  {String} type - data type, one of int8, int16, int32,
   *                         uint8, uint16, uint32, float32
   * @return {undefined}
   */
  _initField(name: string, size: number, type: TypedArrayString) {
    this[name] = getTypedArray(type, this.length * size)
  }

  /**
   * Add a field
   * @param  {String} name - field name
   * @param  {Integer} size - element size
   * @param  {String} type - data type, one of int8, int16, int32,
   *                         uint8, uint16, uint32, float32
   * @return {undefined}
   */
  addField(name: string, size: number, type: TypedArrayString) {
    this._fields.push([name, size, type])
    this._initField(name, size, type)
  }

  /**
   * Allows to add values to the store fields simultaneously.
   * It is expected that *all* of the fields provided by the store
   * will have their value defined in the newly added record and
   * all the arrays with values are of the same length.
   * 
   * @param index index where the data should be inserted
   * @param count number of records to add (some of them may be represented by multiple values, e.g. vector-based ones)
   * @param newValRec defines the values to add; if not provided, the store will be resized but no values will be overriden
   *   
   * Catana extension.
   */
  insertRecords(index: number, addedCount: number, newValRec?: { [r: string]: [number] }) {
    if (this.length <= this.count + addedCount) {
      this.resize(Math.ceil(1.25 * (this.count + addedCount)));
    }

    if (index !== this.count) {
      this.copyWithin(index + addedCount, index, this.count - index);
    }

    if (newValRec !== undefined) {
      this._fields.forEach(sf => {
        const addedVal = newValRec[sf[0]];
        if (addedVal !== undefined) {
          const arr = this[sf[0]];
          const itemSize = sf[1];
          const startIdx = itemSize * index;
          for (let i = 0; i < addedVal.length; ++i) {
            arr[startIdx + i] = addedVal[i];
          }
        } else {
          console.error("Adding incomplete record", newValRec, "to", this._fields);
        }
      });
    }

    this.count += addedCount;
  }

  appendRecords(addedCount: number, newValRec?: { [r: string]: [number] }) {
    this.insertRecords(this.count, addedCount, newValRec);
  }

  prependRecords(addedCount: number, newValRec?: { [r: string]: [number] }) {
    this.insertRecords(0, addedCount, newValRec);
  }

  removeRecord(index: number) {
    if (index >= 0 && index < this.count) {
      this.copyWithin(index, index + 1, this.count - 1 - index);
      --this.count;
    }
  }

  /**
   * Resize the store to the new size
   * @param  {Integer} size - new size
   * @return {undefined}
   */
  resize(size?: number) {
    // Log.time( "Store.resize" );

    this.length = Math.round(size || 0)
    this.count = Math.min(this.count, this.length)

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[i][0]
      const itemSize = this._fields[i][1]
      const arraySize = this.length * itemSize
      const tmpArray = new this[name].constructor(arraySize)

      if (this[name].length > arraySize) {
        tmpArray.set(this[name].subarray(0, arraySize))
      } else {
        tmpArray.set(this[name])
      }
      this[name] = tmpArray
    }

    // Log.timeEnd( "Store.resize" );
  }

  /**
   * Resize the store to 1.5 times its current size if full
   * @return {undefined}
   */
  growIfFull() {
    if (this.count >= this.length) {
      const size = Math.round(this.length * 1.5)
      this.resize(Math.max(256, size))
    }
  }

  /**
   * Reduces the container length to equal its count.
   * Catana extension.
   */
  shrinkToFit() {
    this.resize(this.count);
  }

  /**
   * Copy data from one store to another
   * @param  {Store} other - store to copy from
   * @param  {Integer} thisOffset - offset to start copying to
   * @param  {Integer} otherOffset - offset to start copying from
   * @param  {Integer} length - number of entries to copy
   * @return {undefined}
   */
  copyFrom(other: Store, thisOffset: number, otherOffset: number, length: number) {
    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[i][0]
      const itemSize = this._fields[i][1]
      const thisField = this[name]
      const otherField = other[name]

      for (let j = 0; j < length; ++j) {
        const thisIndex = itemSize * (thisOffset + j)
        const otherIndex = itemSize * (otherOffset + j)
        for (let k = 0; k < itemSize; ++k) {
          thisField[thisIndex + k] = otherField[otherIndex + k]
        }
      }
    }
  }

  /**
   * Copy data within this store
   * @param  {Integer} destinationOffset - offset to start copying to
   * @param  {Integer} sourceOffset - offset to start copying from
   * @param  {Integer} length - number of entries to copy
   * @return {undefined}
   */
  copyWithin(destinationOffset: number, sourceOffset: number, length: number) {
    // This checks for scenario of overlapping intervals
    // where the data would be replaced by new one before being copied to the destination
    let copyBackToFront: boolean = destinationOffset > sourceOffset &&
      destinationOffset - sourceOffset <= length;

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[i][0]
      const itemSize = this._fields[i][1]
      const thisField = this[name]

      if (!copyBackToFront) {
        for (let j = 0; j < length; ++j) {
          const targetIndex = itemSize * (destinationOffset + j)
          const sourceIndex = itemSize * (sourceOffset + j)
          for (let k = 0; k < itemSize; ++k) {
            thisField[targetIndex + k] = thisField[sourceIndex + k]
          }
        }
      }
      else {
        for (let j = length - 1; j >= 0; --j) {
          const targetIndex = itemSize * (destinationOffset + j)
          const sourceIndex = itemSize * (sourceOffset + j)
          for (let k = 0; k < itemSize; ++k) {
            thisField[targetIndex + k] = thisField[sourceIndex + k]
          }
        }
      }
    }
  }

  /**
   * Sort entries in the store given the compare function
   * @param  {[type]} compareFunction - function to sort by
   * @return {undefined}
   */
  sort(compareFunction: (a: any, b: any) => number) {
    Log.time('Store.sort')

    const thisStore = this
    const tmpStore = new (this.constructor as any)(1)

    function swap(index1: number, index2: number) {
      if (index1 === index2) return
      tmpStore.copyFrom(thisStore, 0, index1, 1)
      thisStore.copyWithin(index1, index2, 1)
      thisStore.copyFrom(tmpStore, index2, 0, 1)
    }

    function quicksort(left: number, right: number) {
      if (left < right) {
        let pivot = Math.floor((left + right) / 2)
        let leftNew = left
        let rightNew = right
        do {
          while (compareFunction(leftNew, pivot) < 0) {
            leftNew += 1
          }
          while (compareFunction(rightNew, pivot) > 0) {
            rightNew -= 1
          }
          if (leftNew <= rightNew) {
            if (leftNew === pivot) {
              pivot = rightNew
            } else if (rightNew === pivot) {
              pivot = leftNew
            }
            swap(leftNew, rightNew)
            leftNew += 1
            rightNew -= 1
          }
        } while (leftNew <= rightNew)
        quicksort(left, rightNew)
        quicksort(leftNew, right)
      }
    }

    quicksort(0, this.count - 1)

    Log.timeEnd('Store.sort')
  }

  /**
   * Left-rotates the array with the given shift in the desired direction
   * In-situ algorithm
   * 
   * Catana extension 
   */
  rotate(shift: number): void {
    const tmpRecStore = new (this.constructor as any)(1);

    // Rotation by one will be performed "shift"-times
    for (let i = 0; i < shift; ++i) {
      // Store first record in temp arrays
      tmpRecStore.copyFrom(this, 0, 0, 1);

      // Shift the rest by one
      for (let j = 1; j < this.count; ++j) {
        this.copyWithin(j - 1, j, 1);
      }

      // Append the record at the end
      this.copyFrom(tmpRecStore, this.count - 1, 0, 1);
    }
  }

  /**
   * Empty the store
   * @return {undefined}
   */
  clear() {
    this.count = 0
  }

  /**
   * Dispose of the store entries and fields
   * @return {undefined}
   */
  dispose() {
    delete this.length
    delete this.count

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[i][0]
      delete this[name]
    }
  }

  // Catana addition
  public get estimatedSizeInBytes(): number {
    let size: number = 0;
    for (const f of this._fields) {
      const array: any = this[f[0]];
      if (array.BYTES_PER_ELEMENT && array.length) {
        size += (array.BYTES_PER_ELEMENT * array.length);
      }
    }
    return size;
  }
}