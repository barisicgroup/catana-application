
import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import PdbWriter from '../../src/writer/pdb-writer'


import { join } from 'path'
import * as fs from 'fs'

describe('writer/pdb-writer', function () {
  describe('writing', function () {
    it('getData', function () {
      var file = join(__dirname, '/../data/1crn.pdb')
      var str = fs.readFileSync(file, 'utf-8')
      var atomRecords = (str.match(/^ATOM     /g) || []).length;
      var terRecords = (str.match(/^TER     /g) || []).length;
      var streamer = new StringStreamer(str)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var pdbWriter = new PdbWriter(structure)
        var string = pdbWriter.getData()
        var thisAtomRecords = (string.match(/^ATOM     /g) || []).length;
        var thisTerRecords = (string.match(/^TER     /g) || []).length;
        expect(thisAtomRecords).toBe(atomRecords);
        expect(thisTerRecords).toBe(terRecords);
      })
    })

    // skip because there is no Blob in node.js
    it.skip('getBlob', function () {
      var file = join(__dirname, '/../data/1crn.pdb')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var pdbWriter = new PdbWriter(structure)
        var blob = pdbWriter.getBlob()
        expect(blob.type).toBe('text/plain')
        expect(blob.size).toBe(26156)
      })
    })
  })
})
