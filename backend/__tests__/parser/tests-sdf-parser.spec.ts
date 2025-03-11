
import StringStreamer from '../../src/streamer/string-streamer'
import SdfParser from '../../src/parser/sdf-parser'


import { join } from 'path'
import * as fs from 'fs'
import { Structure } from '../../src/catana'
import AtomStore from '../../src/store/atom-store'

describe('parser/sdf-parser', function () {
  describe('parsing', function () {
    it('basic', function () {
      var file = join(__dirname, '/../data/01W_ideal.sdf')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var sdfParser = new SdfParser(streamer)
      return sdfParser.parse().then(function (structure) {
        expect(structure.atomCount).toBe(32)
        expect(structure.bondCount).toBe(32)
        expect(structure.atomStore.formalCharge).toBeTruthy()
        expect(structure.atomStore.formalCharge[0]).toBe(-1)
        expect(structure.atomStore.formalCharge[1]).toBe(1)
        expect(structure.atomStore.formalCharge[2]).toBe(0)
      })
    })
  })

  // CATANA extensions

  describe('autonaming', function () {
    it('amino acids', function () {
      const aaSdfNames = [
        "ala.sdf",
        "arg.sdf",
        "asn.sdf",
        "asp.sdf",
        "cys.sdf",
        "gln.sdf",
        "glu.sdf",
        "gly.sdf",
        "his.sdf",
        "ile.sdf",
        "leu.sdf",
        "lys.sdf",
        "met.sdf",
        "phe.sdf",
        "pro.sdf",
        "sec.sdf",
        "ser.sdf",
        "thr.sdf",
        "trp.sdf",
        "tyr.sdf",
        "val.sdf"];

      aaSdfNames.forEach(function (sdfFileName) {
        let namesToFind = [
          "CA", "C", "N", "O"
        ];

        let file = join(__dirname, '../data/sdf_structures/amino_acids/', sdfFileName);
        let str = fs.readFileSync(file, 'utf-8');
        let streamer = new StringStreamer(str);
        let sdfParser = new SdfParser(streamer);
        return sdfParser.parse().then(function (structure: Structure) {
          let as: AtomStore = structure.atomStore;

          for (let i = 0; i < as.count; ++i) {
            let mapRecord = structure.atomMap.get(as.atomTypeId[i]);

            const index = namesToFind.indexOf(mapRecord.atomname, 0);
            if (index > -1) {
              namesToFind.splice(index, 1);
            }

            if (namesToFind.length === 0) { break; }
          }

          expect(namesToFind.length).toBe(0);
        }).catch(function () { fail("autoname tests failed."); });
      });
    })

    /*it('nucleic acids (DNA)', function () {
      const nuclSdfNames = [
        "DA.sdf",
        "DC.sdf",
        "DG.sdf",
        "DT.sdf"];

      nuclSdfNames.forEach(function (sdfFileName) {
        let namesToFind = [
          "P", "C2'", "C3'", "O3'", "O4'"
        ];

        let file = join(__dirname, '../../catana_data/sdf_structures/deoxyribonucleotides/', sdfFileName);
        let str = fs.readFileSync(file, 'utf-8');
        let streamer = new StringStreamer(str);
        let sdfParser = new SdfParser(streamer);
        return sdfParser.parse().then(function (structure: Structure) {
          let as: AtomStore = structure.atomStore;

          for (let i = 0; i < as.count; ++i) {
            let mapRecord = structure.atomMap.get(as.atomTypeId[i]);

            const index = namesToFind.indexOf(mapRecord.atomname, 0);
            if (index > -1) {
              namesToFind.splice(index, 1);
            }

            if (namesToFind.length === 0) { break; }
          }

          expect(namesToFind.length).toBe(0);
        }).catch(function () { fail("autoname tests failed."); });
      });
    })*/
  })
})
