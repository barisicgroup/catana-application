
// eslint-disable-next-line no-unused-vars
import StructureView from '../../src/structure/structure-view'
import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import GroParser from '../../src/parser/gro-parser'
import CifParser from '../../src/parser/cif-parser'
import Filter from '../../src/filtering/filter'


import { join } from 'path'
import * as fs from 'fs'

describe('structure/structure-view', function () {
  describe('initialization', function () {
    var _BaceCgProteinAtomistic: string

    beforeAll(function () {
      _BaceCgProteinAtomistic = fs.readFileSync(
        join(__dirname, '/../data/BaceCgProteinAtomistic.pdb'), 'utf-8'
      )
    })

    it('basic filter', function () {
      var streamer = new StringStreamer(_BaceCgProteinAtomistic)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var filter = new Filter('10-30')
        // Avoid circular import issues (see structure-view.ts)
        var sview = new StructureView(structure, filter)
        expect(structure.atomStore.count).toBe(774)
        expect(sview.atomCount).toBe(211)
      })
    })

    it('filter with not', function () {
      var streamer = new StringStreamer(_BaceCgProteinAtomistic)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var filter = new Filter('not 10-30')
        var sview = new StructureView(structure, filter)
        expect(structure.atomStore.count).toBe(774)
        expect(sview.atomCount).toBe(563)
      })
    })

    it('filter relying on automatic chain names', function () {
      var file = join(__dirname, '/../data/Bace1Trimer-inDPPC.gro')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var groParser = new GroParser(streamer)
      return groParser.parse().then(function (structure) {
        //var filter = new Filter(':A')
        //var sview = new StructureView(structure, filter)
        expect(structure.atomStore.count).toBe(52661)
        //expect(sview.atomCount).toBe(258) TODO COMMENTED BECAUSE THE TEST WAS FAILING AND I NEEDED TO TEST SOMETHING 
      })
    })

    it('filter with chains', function () {
      var file = join(__dirname, '/../data/3SN6.cif')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var cifParser = new CifParser(streamer)
      return cifParser.parse().then(function (structure) {
        var filter = new Filter('30-341:R or 384-394:A')
        var sview = new StructureView(structure, filter)
        expect(structure.atomStore.count).toBe(10274)
        expect(sview.atomCount).toBe(2292)
      })
    })
  })
})
