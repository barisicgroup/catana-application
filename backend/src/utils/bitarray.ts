/**
 * @file Bit array
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author Paul Pillot <paulpillot@gmail.com>
 * @private
 */

/**
 * Compute the Hamming weight of a 32-bit unsigned integer
 * @param  {Integer} v - a 32-bit unsigned integer
 * @return {Integer} the Hamming weight
 */
function hammingWeight (v: number) {
  // works with signed or unsigned shifts
  v -= ((v >>> 1) & 0x55555555)
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333)
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24
}

export class BitArray {

  private static readonly ONE_OVER_32 = 0.03125;
  //private static readonly BIT = 0b10000000000000000000000000000000; // 32 bits
  ///private static readonly BIT = 0x80000000; // Same as commented-out line above

  private readonly _raw: Uint32Array;
  private readonly _length: number;

  public get length() { return this._length; }
  public get raw() { return this._raw; }

  public constructor(length: number, input?: number | number[] | Uint32Array) {
    if (input === undefined) {
      this._raw = new Uint32Array(Math.ceil(length / 32));
      this._length = length;
      return;

    } else if (typeof input === "number") {
      input = [input];
    }

    //const capacity = input.length * 32;
    const expectedChunks = Math.ceil(length * BitArray.ONE_OVER_32);
    if (expectedChunks !== input.length) {
      console.warn("Expected " + expectedChunks + " chunks in BitArray, but got " + input.length + " instead. Probable mistake here.");
    }

    this._raw = input instanceof Uint32Array ? input : new Uint32Array(input);
    this._length = length;
  }

  public static convert(input: number[] | Uint32Array) {
    const length = input.length;
    const array = new Uint32Array(Math.ceil(length * BitArray.ONE_OVER_32));
    for (let i = 0; i < length * BitArray.ONE_OVER_32; ++i) {
      const end = Math.min(length, (i + 1) * 32);
      let chunk = 0;
      for (let j = 0, jj = i * 32; jj < end; ++j, ++jj) {
        const v = input[jj];
        if (v !== 0) {
          chunk |= (BitArray.bit(j));
        }
      }
      array[i] = chunk;
    }
    return new BitArray(length, array);
  }

  public get(i: number): boolean {
    const ii = Math.floor(i * BitArray.ONE_OVER_32);
    i = i % 32;
    const chunk = this._raw[ii];
    const bit = BitArray.bit(i);
    return (chunk & bit) !== 0;
  }

  public toString() {
    let strFinal = "";
    let bitCount = 0;
    for (const u32 of this._raw) {
      let str = u32.toString(2);
      while (str.length < 32 && bitCount < this._length) {
        str = "0" + str;
        ++bitCount;
      }
      strFinal += " " + str;
    }
    return strFinal.slice(0, this._length + this._raw.length);
  }

  public equals(that: BitArray): boolean {
    if (that._length !== this._length) return false;

    // Skip last chunk
    let chunk_i = 0;
    for (; chunk_i < this._raw.length - 1; ++chunk_i) {
      if (this._raw[chunk_i] !== that._raw[chunk_i]) return false;
    }

    // Last chunk special case
    const junk = 32 - (this._length % 32);
    const a = this._raw[chunk_i] >>> (junk);
    const b = that._raw[chunk_i] >>> (junk);
    return a === b;
  }

  public forEach(callback: (bit: boolean, i: number) => void) {
    let i = 0;
    for (const chunk of this._raw) {
      for (let j = 0; j < 32 && i < this._length; ++j, ++i) {
        let bit = BitArray.bit(j);
        callback((chunk & bit) !== 0, i);
      }
    }
  }

  public forEach1(callback: (i: number) => void) {
    let i = 0;
    for (const chunk of this._raw) {
      if (chunk === 0) {
        i += 32;
        continue;
      }
      for (let j = 0; j < 32 && i < this._length; ++j, ++i) {
        let bit = BitArray.bit(j) & chunk;
        if (bit !== 0) callback(i);
      }
    }
  }

  public forEach0(callback: (i: number) => void) {
    let i = 0;
    for (const chunk of this._raw) {
      if (chunk === 0xffffffff) {
        i += 32;
        continue;
      }
      for (let j = 0; j < 32 && i < this._length; ++j, ++i) {
        let bit = BitArray.bit(j) & chunk;
        if (bit === 0) callback(i);
      }
    }
  }

  public is0(rangeStart: number = 0, rangeEnd?: number): boolean {
    rangeEnd = Math.min(rangeEnd || this._length, this._length);
    if (rangeEnd < rangeStart) {
      const t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }
    if (rangeEnd === rangeStart) return true;

    const firstChunk = Math.floor(rangeStart / 32);
    const lastChunk = Math.floor((rangeEnd - 1) / 32);

    const maskStart = 0xffffffff >>> (rangeStart % 32);
    const maskEnd = (rangeEnd % 32 === 0) ? 0xffffffff : ~(0xffffffff >>> (rangeEnd % 32));

    // One chunk special case
    if (firstChunk === lastChunk) return (this._raw[firstChunk] & maskStart & maskEnd) === 0;

    // First chunk special case
    if ((this._raw[firstChunk] & maskStart) !== 0) return false;

    // Skip last chunk
    let chunk_i = firstChunk + 1;
    for (; chunk_i < lastChunk - 1; ++chunk_i) {
      if (this._raw[chunk_i] !== 0) return false;
    }

    // Last chunk special case
    return (this._raw[lastChunk] & maskEnd) === 0;
  }

  public difference(that: BitArray): this {
    for (let i = 0; i < this._raw.length; ++i) {
      this._raw[i] = this._raw[i] & ~(that._raw[i]);
    }
    return this;
  }

  public clone(): BitArray {
    return new BitArray(this._length, this._raw.slice());
  }

  public slice(start: number = 0, end?: number): BitArray {
    end = end || this._length;
    if (end < start) {
      const t = start;
      start = end;
      end = t;
    }

    if (start === 0 && end === this._length) return this.clone();
    if (end === start) return new BitArray(0);

    const firstElemOffset = start % 32;
    const lastElemOffset = end % 32;

    const firstChunk = Math.floor(start / 32);
    const lastChunk = Math.floor((end - 1) / 32);

    const chunks = new Uint32Array(Math.ceil((end - start) / 32));

    let chunk_src = firstChunk;
    let chunk_dst = 0;

    const lastStartMask = chunks.length === 1 ? 0xffffffff >>> firstElemOffset : 0xffffffff;
    const lastEndMask = lastElemOffset === 0 ? 0xffffffff : ~(0xffffffff >>> lastElemOffset);
    const lastMask = lastStartMask & lastEndMask;

    if (firstElemOffset === 0) {
      for (; chunk_src < lastChunk; ++chunk_dst, ++chunk_src) {
        chunks[chunk_dst] = this._raw[chunk_src];
      }
      // Last chunk special case
      chunks[chunks.length - 1] &= lastMask;

    } else {
      const shift1 = firstElemOffset;
      const shift2 = 32 - shift1;
      const mask1 = 0xffffffff >>> shift1;
      const mask2 = ~mask1;
      // Skip last chunk
      for (; chunk_src < lastChunk; ++chunk_dst, ++chunk_src) {
        const chunk1 = this._raw[chunk_src]     & mask1;
        const chunk2 = this._raw[chunk_src + 1] & mask2;
        chunks[chunk_dst] = (chunk1 << shift1) | (chunk2 >>> shift2);
      }
      // Last chunk special case
      chunks[chunk_dst] = (this._raw[chunk_src] & lastMask) << firstElemOffset;
    }

    return new BitArray(end - start, chunks);
  }

  public toLegacy(): BitArray_Legacy {
    const legacy = new BitArray_Legacy(this._length);
    this.forEach1(i => legacy.set(i));
    return legacy;
  }

  private static bit(i: number): number {
    return 0x80000000 >>> i;
  }
}

/**
 * Bit array
 *
 * Based heavily on https://github.com/lemire/FastBitSet.js
 * which is licensed under the Apache License, Version 2.0.
 */
export default class BitArray_Legacy {
  private _words: Uint32Array
  public length: number

  /**
   * @param  {Integer} length - array length
   * @param  {Boolean} [setAll] - initialize with true
   */
  constructor (length: number, setAll?: boolean) {
    this.length = length
    this._words = new Uint32Array((length + 32) >>> 5)
    if (setAll === true) {
      this.setAll()
    }
  }

  /**
   * Catana addition
   */
  public get raw(): Uint32Array {
    return this._words;
  }

  /**
   * Get value at index
   * @param  {Integer} index - the index
   * @return {Boolean} value
   */
  get (index: number) {
    return (this._words[ index >>> 5 ] & (1 << index)) !== 0
  }

  /**
   * Set value at index to true
   * @param  {Integer} index - the index
   * @return {undefined}
   */
  set (index: number) {
    this._words[ index >>> 5 ] |= 1 << index
  }

  /**
   * Set value at index to false
   * @param  {Integer} index - the index
   * @return {undefined}
   */
  clear (index: number) {
    this._words[ index >>> 5 ] &= ~(1 << index)
  }

  /**
   * Flip value at index
   * @param  {Integer} index - the index
   * @return {undefined}
   */
  flip (index: number) {
    this._words[ index >>> 5 ] ^= 1 << index
  }

  _assignRange (start: number, end: number, value: boolean) {
    if (end < start) return
    const words = this._words
    const wordValue = value === true ? 0xFFFFFFFF : 0
    const wordStart = start >>> 5
    const wordEnd = end >>> 5
        // set complete words when applicable
    for (let k = wordStart + 1; k < wordEnd; ++k) {
      words[ k ] = wordValue
    }
        // set parts of the range not spanning complete words
    const startWord = wordStart << 5
    const endWord = wordEnd << 5
    if (value === true) {
      if (end - start < 32) {
        for (let i = start, n = end + 1; i < n; ++i) {
          words[ i >>> 5 ] |= 1 << i
        }
      } else {
        for (let i = start, n = startWord + 32; i < n; ++i) {
          words[ i >>> 5 ] |= 1 << i
        }
        for (let i = endWord, n = end + 1; i < n; ++i) {
          words[ i >>> 5 ] |= 1 << i
        }
      }
    } else {
      if (end - start < 32) {
        for (let i = start, n = end + 1; i < n; ++i) {
          words[ i >>> 5 ] &= ~(1 << i)
        }
      } else {
        for (let i = start, n = startWord + 32; i < n; ++i) {
          words[ i >>> 5 ] &= ~(1 << i)
        }
        for (let i = endWord, n = end + 1; i < n; ++i) {
          words[ i >>> 5 ] &= ~(1 << i)
        }
      }
    }
    return this
  }

  /**
   * Set bits of the given range
   * @param {Integer} start - start index
   * @param {Integer} end - end index
   * @return {BitArray_Legacy} this object
   */
  setRange (start: number, end: number) {
    return this._assignRange(start, end, true)
  }

  /**
   * Clear bits of the given range
   * @param {Integer} start - start index
   * @param {Integer} end - end index
   * @return {BitArray_Legacy} this object
   */
  clearRange (start: number, end: number) {
    return this._assignRange(start, end, false)
  }

  /**
   * Set bits at all given indices
   * @param {...Integer} arguments - indices
   * @return {Boolean} this object
   */
  setBits (...indices: number[]) {
    const words = this._words
    const n = indices.length
    for (let i = 0; i < n; ++i) {
      const index = indices[ i ]
      words[ index >>> 5 ] |= 1 << index
    }
    return this
  }

  /**
   * Clear bits at all given indices
   * @param {...Integer} arguments - indices
   * @return {Boolean} this object
   */
  clearBits (...indices: number[]) {
    const words = this._words
    const n = indices.length
    for (let i = 0; i < n; ++i) {
      const index = indices[ i ]
      words[ index >>> 5 ] &= ~(1 << index)
    }
    return this
  }

  /**
   * Set all bits of the array
   * @return {BitArray_Legacy} this object
   */
  setAll () {
    return this._assignRange(0, this.length - 1, true)
  }

  /**
   * Clear all bits of the array
   * @return {BitArray_Legacy} this object
   */
  clearAll () {
    return this._assignRange(0, this.length - 1, false)
  }

  /**
   * Flip all the values in the array
   * @return {BitArray_Legacy} this object
   */
  flipAll () {
    const count = this._words.length
    const words = this._words
    const bs = 32 - this.length % 32
    for (let k = 0; k < count - 1; ++k) {
      words[k] = ~words[ k ]
    }
    words[ count - 1 ] = (~(words[ count - 1 ] << bs)) >>> bs
    return this
  }

  _isRangeValue (start: number, end: number, value: boolean) {
    if (end < start) return
    const words = this._words
    const wordValue = value === true ? 0xFFFFFFFF : 0
    const wordStart = start >>> 5
    const wordEnd = end >>> 5
        // set complete words when applicable
    for (let k = wordStart + 1; k < wordEnd; ++k) {
      if (words[ k ] !== wordValue) return false
    }
        // set parts of the range not spanning complete words
    if (end - start < 32) {
      for (let i = start, n = end + 1; i < n; ++i) {
        if (!!(words[ i >>> 5 ] & (1 << i)) !== value) return false
      }
    } else {
      const startWord = wordStart << 5
      const endWord = wordEnd << 5
      for (let i = start, n = startWord + 32; i < n; ++i) {
        if (!!(words[ i >>> 5 ] & (1 << i)) !== value) return false
      }
      for (let i = endWord, n = end + 1; i < n; ++i) {
        if (!!(words[ i >>> 5 ] & (1 << i)) !== value) return false
      }
    }
    return true
  }

  /**
   * Test if bits in given range are set
   * @param {Integer} start - start index
   * @param {Integer} end - end index
   * @return {BitArray_Legacy} this object
   */
  isRangeSet (start: number, end: number) {
    return this._isRangeValue(start, end, true)
  }

  /**
   * Test if bits in given range are clear
   * @param {Integer} start - start index
   * @param {Integer} end - end index
   * @return {BitArray_Legacy} this object
   */
  isRangeClear (start: number, end: number) {
    return this._isRangeValue(start, end, false)
  }

  /**
   * Test if all bits in the array are set
   * @return {Boolean} test result
   */
  isAllSet () {
    return this._isRangeValue(0, this.length - 1, true)
  }

  /**
   * Test if all bits in the array are clear
   * @return {Boolean} test result
   */
  isAllClear () {
    return this._isRangeValue(0, this.length - 1, false)
  }

  /**
   * Test if bits at all given indices are set
   * @param {...Integer} arguments - indices
   * @return {Boolean} test result
   */
  isSet (...indices: number[]) {
    const words = this._words
    const n = indices.length
    for (let i = 0; i < n; ++i) {
      const index = indices[ i ]
      if ((words[ index >>> 5 ] & (1 << index)) === 0) return false
    }
    return true
  }

  /**
   * Test if bits at all given indices are clear
   * @param {...Integer} arguments - indices
   * @return {Boolean} test result
   */
  isClear (...indices: number[]) {
    const words = this._words
    const n = indices.length
    for (let i = 0; i < n; ++i) {
      const index = indices[ i ]
      if ((words[ index >>> 5 ] & (1 << index)) !== 0) return false
    }
    return true
  }

  /**
   * Test if two BitArrays are identical in all their values
   * @param {BitArray_Legacy} otherBitarray - the other BitArray
   * @return {Boolean} test result
   */
  isEqualTo (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    for (let k = 0; k < count; ++k) {
      if (words1[ k ] !== words2[ k ]) {
        return false
      }
    }
    return true
  }

  /**
   * How many set bits?
   * @return {Integer} number of set bits
   */
  getSize () {
    const count = this._words.length
    const words = this._words
    let size = 0
    for (let i = 0; i < count; ++i) {
      size += hammingWeight(words[ i ])
    }
    return size
  }

  /**
   * Calculate difference betwen this and another bit array.
   * Store result in this object.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {BitArray_Legacy} this object
   */
  difference (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    for (let k = 0; k < count; ++k) {
      words1[ k ] = words1[ k ] & ~words2[ k ]
    }
    for (let k = words1.length; k < count; ++k) {
      words1[ k ] = 0
    }
    return this
  }

  /**
   * Calculate union betwen this and another bit array.
   * Store result in this object.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {BitArray_Legacy} this object
   */
  union (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    for (let k = 0; k < count; ++k) {
      words1[ k ] |= words2[ k ]
    }
    for (let k = words1.length; k < count; ++k) {
      words1[ k ] = 0
    }
    return this
  }

  /**
   * Calculate intersection betwen this and another bit array.
   * Store result in this object.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {BitArray_Legacy} this object
   */
  intersection (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    for (let k = 0; k < count; ++k) {
      words1[ k ] &= words2[ k ]
    }
    for (let k = words1.length; k < count; ++k) {
      words1[ k ] = 0
    }
    return this
  }

  /**
   * Test if there is any intersection betwen this and another bit array.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {Boolean} test result
   */
  intersects (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    for (let k = 0; k < count; ++k) {
      if ((words1[ k ] & words2[ k ]) !== 0) {
        return true
      }
    }
    return false
  }

  /**
   * Calculate the number of bits in common betwen this and another bit array.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {Integer} size
   */
  getIntersectionSize (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    let size = 0
    for (let k = 0; k < count; ++k) {
      size += hammingWeight(words1[ k ] & words2[ k ])
    }
    return size
  }

  /**
   * Calculate intersection betwen this and another bit array.
   * Store result in a new bit array.
   * @param  {BitArray_Legacy} otherBitarray - the other bit array
   * @return {BitArray_Legacy} the new bit array
   */
  makeIntersection (otherBitarray: BitArray_Legacy) {
    const words1 = this._words
    const words2 = otherBitarray._words
    const count = Math.min(words1.length, words2.length)
    const wordsA = new Uint32Array(count)
    const intersection = Object.create(BitArray_Legacy.prototype)
    intersection._words = wordsA
    intersection.length = Math.min(this.length, otherBitarray.length)
    for (let k = 0; k < count; ++k) {
      wordsA[ k ] = words1[ k ] & words2[ k ]
    }
    return intersection
  }

  /**
   * Iterate over all set bits in the array
   * @param  {function( index: Integer, i: Integer )} callback - the callback
   * @return {undefined}
   */
  forEach (callback: (index: number, i: number) => any) {
    const count = this._words.length
    const words = this._words
    let i = 0
    for (let k = 0; k < count; ++k) {
      let w = words[ k ]
      while (w !== 0) {
        const t = w & -w
        const index = (k << 5) + hammingWeight(t - 1)
        callback(index, i)
        w ^= t
        ++i
      }
    }
  }

  /**
   * Get an array with the set bits
   * @return {Array} bit indices
   */
  toArray () {
    const words = this._words
    const answer = new Array(this.getSize())
    const count = this._words.length
    let pos = 0
    for (let k = 0; k < count; ++k) {
      let w = words[ k ]
      while (w !== 0) {
        const t = w & -w
        answer[ pos++ ] = (k << 5) + hammingWeight(t - 1)
        w ^= t
      }
    }
    return answer
  }

  toString () {
    return '{' + this.toArray().join(',') + '}'
  }

  toFiltString () {
    const filt = this.toArray().join(',')
    return filt ? '@' + filt : 'NONE'
  }

  /**
   * Clone this object
   * @return {BitArray_Legacy} the cloned object
   */
  clone () {
    const clone = Object.create(BitArray_Legacy.prototype)
    clone.length = this.length
    clone._words = new Uint32Array(this._words)
    return clone
  }

  // Catana addition
  public get estimatedSizeInBytes(): number {
    return this._words.length * this._words.BYTES_PER_ELEMENT;
  }
}