
import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import CifParser from '../../src/parser/cif-parser'
import Structure from '../../src/structure/structure'
import StructureView from '../../src/structure/structure-view'
import Filter from '../../src/filtering/filter'
import { kwd } from '../../src/filtering/filtering-constants'


import { join } from 'path'
import * as fs from 'fs'
import AtomProxy from '../../src/proxy/atom-proxy'


describe('filtering/filter', function () {
  describe('parsing', function () {
    it('chain', function () {
      var filt = ':A'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'chainname': 'A' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('chain resno range', function () {
      var filt = '1-100:A'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'AND',
        'rules': [
          { 'chainname': 'A' },
          { 'resno': [ 1, 100 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('HOH or .OH', function () {
      var filt = 'HOH or .OH'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'HOH' },
          { 'atomname': 'OH' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('modelindex', function () {
      var filt = '/1'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'model': 1 }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('altloc', function () {
      var filt = '%A'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'altloc': 'A' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('inscode', function () {
      var filt = '^C'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'inscode': 'C' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parens', function () {
      var filt = '10-15 or ( backbone and ( 30-35 or 40-45 ) )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resno': [ 10, 15 ] },
          {
            'operator': 'AND',
            'rules': [
              { 'keyword': kwd.BACKBONE },
              {
                'operator': 'OR',
                'rules': [
                  { 'resno': [ 30, 35 ] },
                  { 'resno': [ 40, 45 ] }
                ]
              }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('no parens', function () {
      var filt = '10-15 or backbone and 30-35 or 40-45'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resno': [ 10, 15 ] },
          {
            'operator': 'AND',
            'rules': [
              { 'keyword': kwd.BACKBONE },
              { 'resno': [ 30, 35 ] }
            ]
          },
          { 'resno': [ 40, 45 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('outer parens', function () {
      var filt = '( 10-15 or backbone )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resno': [ 10, 15 ] },
          { 'keyword': kwd.BACKBONE }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parsing error resi', function () {
      var filt = '( foobar )'
      var filter = new Filter(filt)
      var filterObj = {
        'error': 'resi must be an integer'
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parsing error atomname', function () {
      var filt = '.FOOBAR'
      var filter = new Filter(filt)
      var filterObj = {
        'error': 'atomname must be one to four characters'
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parsing multi-char chain', function () {
      var filt = ':ABJ/0'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'AND',
        'rules': [
          { 'model': 0 },
          { 'chainname': 'ABJ' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parsing error model', function () {
      var filt = '/Q'
      var filter = new Filter(filt)
      var filterObj = {
        'error': 'model must be an integer'
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('parsing error resi range', function () {
      var filt = '1-2-3'
      var filter = new Filter(filt)
      var filterObj = {
        'error': "resi range must contain one -"
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate simple', function () {
      var filt = 'not 10-15'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'negate': true,
        'rules': [
          { 'resno': [ 10, 15 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate or', function () {
      var filt = 'MET or not 10-15'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              { 'resno': [ 10, 15 ] }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate parens', function () {
      var filt = 'MET or not ( 10-15 )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              {
                'operator': undefined,
                'rules': [
                  { 'resno': [ 10, 15 ] }
                ]
              }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate parens 2', function () {
      var filt = 'MET or not ( 10-15 and 15-20 )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              {
                'operator': 'AND',
                'rules': [
                  { 'resno': [ 10, 15 ] },
                  { 'resno': [ 15, 20 ] }
                ]
              }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate parens 3', function () {
      var filt = 'MET or not ( 10-15 and 15-20 ) or GLU'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              {
                'operator': 'AND',
                'rules': [
                  { 'resno': [ 10, 15 ] },
                  { 'resno': [ 15, 20 ] }
                ]
              }
            ]
          },
          { 'resname': 'GLU' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate parens 4', function () {
      var filt = 'MET or not ( 10-15 and 15-20 ) and GLU'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': 'AND',
            'rules': [
              {
                'operator': undefined,
                'negate': true,
                'rules': [
                  {
                    'operator': 'AND',
                    'rules': [
                      { 'resno': [ 10, 15 ] },
                      { 'resno': [ 15, 20 ] }
                    ]
                  }
                ]
              },
              { 'resname': 'GLU' }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negate parens 5', function () {
      var filt = '1-100 and not ( MET or GLU ) or 300-330'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          {
            'operator': 'AND',
            'rules': [
              { 'resno': [ 1, 100 ] },
              {
                'operator': undefined,
                'negate': true,
                'rules': [
                  {
                    'operator': 'OR',
                    'rules': [
                      { 'resname': 'MET' },
                      { 'resname': 'GLU' }
                    ]
                  }
                ]
              }
            ]
          },
          { 'resno': [ 300, 330 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not backbone or .CA', function () {
      var filt = 'not backbone or .CA'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              { 'keyword': kwd.BACKBONE }
            ]
          },
          { 'atomname': 'CA' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('.CA or not backbone', function () {
      var filt = '.CA or not backbone'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'atomname': 'CA' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              { 'keyword': kwd.BACKBONE }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('MET or GLY', function () {
      var filt = 'MET or GLY'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          { 'resname': 'GLY' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not ( MET ) or GLY', function () {
      var filt = 'not ( MET ) or GLY'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              {
                'operator': undefined,
                'rules': [
                  { 'resname': 'MET' }
                ]
              }
            ]
          },
          { 'resname': 'GLY' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not ( MET or GLY )', function () {
      var filt = 'not ( MET or GLY )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'negate': true,
        'rules': [
          {
            'operator': 'OR',
            'rules': [
              { 'resname': 'MET' },
              { 'resname': 'GLY' }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not ( MET )', function () {
      var filt = 'not ( MET )'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'negate': true,
        'rules': [
          {
            'operator': undefined,
            'rules': [
              { 'resname': 'MET' }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not not MET', function () {
      var filt = 'not not MET'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'negate': true,
        'rules': [
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              { 'resname': 'MET' }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('not not not MET', function () {
      var filt = 'not not not MET'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'negate': true,
        'rules': [
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              {
                'operator': undefined,
                'negate': true,
                'rules': [
                  { 'resname': 'MET' }
                ]
              }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('MET or sidechain', function () {
      var filt = 'MET or sidechain'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          { 'keyword': kwd.SIDECHAIN }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('MET or not sidechain', function () {
      var filt = 'MET or not sidechain'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'resname': 'MET' },
          {
            'operator': undefined,
            'negate': true,
            'rules': [
              { 'keyword': kwd.SIDECHAIN }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('element H', function () {
      var filt = '_H'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'element': 'H' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('(CYS and .CA) or (CYS and hydrogen)', function () {
      var filt = '(CYS and .CA) or (CYS and hydrogen)'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          {
            'operator': 'AND',
            'rules': [
              { 'resname': 'CYS' },
              { 'atomname': 'CA' }
            ]
          },
          {
            'operator': 'AND',
            'rules': [
              { 'resname': 'CYS' },
              { 'operator': 'OR',
                'rules': [
                  { 'element': 'H' },
                  { 'element': 'D' }
                ]
              }
            ]
          }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('atomindex @1,2,3', function () {
      var filt = '@1,2,3'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'atomindex': [ 1, 2, 3 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('atomindex @1,13,2 OR protein', function () {
      var filt = '@1,13,2 OR protein'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'OR',
        'rules': [
          { 'atomindex': [ 1, 2, 13 ] },
          { 'keyword': kwd.PROTEIN }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('atomindex @0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19', function () {
      var filt = '@0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'atomindex': [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('[123]', function () {
      var filt = '[123]'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'resname': '123' }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('15^C:A.N%A/0', function () {
      var filt = '15^C:A.N%A/0'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': 'AND',
        'rules': [
          { 'model': 0 },
          { 'altloc': 'A' },
          { 'atomname': 'N' },
          { 'chainname': 'A' },
          { 'inscode': 'C' },
          { 'resno': 15 }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negative resno -143', function () {
      var filt = '-143'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'resno': -143 }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negative resno range -12-14', function () {
      var filt = '-12-14'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'resno': [ -12, 14 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('negative resno range -12--8', function () {
      var filt = '-12--8'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'resno': [ -12, -8 ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('bonded', function () {
      var filt = 'bonded'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'keyword': kwd.BONDED }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('ring', function () {
      var filt = 'ring'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'keyword': kwd.RING }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })

    it('resname list', function () {
      var filt = '[ALA,MET,GLU]'
      var filter = new Filter(filt)
      var filterObj = {
        'operator': undefined,
        'rules': [
          { 'resname': [ 'ALA', 'MET', 'GLU' ] }
        ]
      }
      expect(filter.filter).toEqual(filterObj)
    })
  })

  function getNthFilteredAtom (structure: Structure|StructureView, nth: number) {
    var i = 0
    var atomProxy = structure.getAtomProxy()
    structure.eachAtom(function (ap: AtomProxy) {
      if (i === nth) atomProxy.index = ap.index
      ++i
    })
    return atomProxy
  }

  describe('filter', function () {
    var _1crnPdb: string

    beforeAll(function () {
      _1crnPdb = fs.readFileSync(join(__dirname, '../data/1crn.pdb'), 'utf-8')
    })

    it('backbone', function () {
      var filt = 'backbone'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure: Structure) {
        // Cannot use structure.getView as this function is
        // patched in in JS (to avoid circular imports)
        var sview = new StructureView(structure, filter)
        var ap = getNthFilteredAtom(sview, 0)
        expect(sview.atomCount).toBe(185)
        expect(ap.atomname).toBe('N')
      })
    })

    it('.CA', function () {
      var filt = '.CA'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap = getNthFilteredAtom(sview, 30)
        expect(sview.atomCount).toBe(46)
        expect(ap.atomname).toBe('CA')
      })
    })

    it('ARG or .N', function () {
      var filt = 'ARG or .N'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        expect(sview.atomCount).toBe(22 + 46 - 2)
      })
    })

    it('not backbone', function () {
      var filt = 'not backbone'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap = getNthFilteredAtom(sview, 0)
        expect(sview.atomCount).toBe(142)
        expect(ap.atomname).toBe('CB')
      })
    })

    it('sidechain', function () {
      var filt = 'sidechain'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap = getNthFilteredAtom(sview, 0)
        expect(sview.atomCount).toBe(142)
        expect(ap.atomname).toBe('CB')
      })
    })

    it('not backbone or .CA', function () {
      var filt = 'not backbone or .CA'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap1 = getNthFilteredAtom(sview, 0)
        var ap2 = getNthFilteredAtom(sview, 1)
        expect(sview.atomCount).toBe(188)
        expect(ap1.atomname).toBe('CA')
        expect(ap2.atomname).toBe('CB')
      })
    })

    it('TYR vs not not TYR', function () {
      var filter1 = new Filter('TYR')
      var filter2 = new Filter('not not TYR')
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview1 = new StructureView(structure, filter1)
        var sview2 = new StructureView(structure, filter2)
        expect(sview1.atomCount).toBe(sview2.atomCount)
      })
    })

    it('not ( 12 and .CA ) vs not ( 12.CA )', function () {
      var filter1 = new Filter('not ( 12 and .CA )')
      var filter2 = new Filter('not ( 12.CA )')
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview1 = new StructureView(structure, filter1)
        var sview2 = new StructureView(structure, filter2)
        expect(sview1.atomCount).toBe(sview2.atomCount)
      })
    })

    it('/1 PDB', function () {
      var filt = '/1'
      var filter = new Filter(filt)
      var file = join(__dirname, '../data/1LVZ.pdb')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var pdbParser = new PdbParser(streamer, { firstModelOnly: false })
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap1 = getNthFilteredAtom(sview, 0)
        var ap2 = getNthFilteredAtom(sview, sview.atomCount - 1)
        expect(ap1.modelIndex).toBe(1)
        expect(ap2.modelIndex).toBe(1)
      })
    })

    it('/1 CIF', function () {
      var filt = '/1'
      var filter = new Filter(filt)
      var file = join(__dirname, '../data/1LVZ.cif')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var cifParser = new CifParser(streamer, { firstModelOnly: false })
      return cifParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap1 = getNthFilteredAtom(sview, 0)
        var ap2 = getNthFilteredAtom(sview, sview.atomCount - 1)
        expect(ap1.modelIndex).toBe(1)
        expect(ap2.modelIndex).toBe(1)
      })
    })

    it('atomindex', function () {
      var filt = '@1,8,12'
      var filter = new Filter(filt)
      var streamer = new StringStreamer(_1crnPdb)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        var ap1 = getNthFilteredAtom(sview, 0)
        var ap2 = getNthFilteredAtom(sview, 1)
        var ap3 = getNthFilteredAtom(sview, 2)
        expect(sview.atomCount).toBe(3)
        expect(ap1.index).toBe(1)
        expect(ap2.index).toBe(8)
        expect(ap3.index).toBe(12)
      })
    })

    it('lowercase resname', function () {
      var filt = 'phe'
      var filter = new Filter(filt)
      var file = join(__dirname, '../data/lowerCaseResname.pdb')
      var str = fs.readFileSync(file, 'utf-8')
      var streamer = new StringStreamer(str)
      var pdbParser = new PdbParser(streamer)
      return pdbParser.parse().then(function (structure) {
        var sview = new StructureView(structure, filter)
        expect(sview.atomCount).toBe(13)
      })
    })
  })
})
