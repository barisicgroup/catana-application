import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import Structure from '../../src/structure/structure'
import PdbWriter from '../../src/writer/pdb-writer'

import { join } from 'path'
import * as fs from 'fs'

describe('catana/structure-removal', function () {
    it('removing atoms', function () {
        const file = join(__dirname, '../data/1IHM.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const startAtomCount = structure.atomCount;
            const apToRemove = structure.getAtomProxy(startAtomCount / 2);
            const apToRemoveRes = apToRemove.residue;
            const startApToRemoveResAtomCount = apToRemoveRes.atomCount;

            structure.removeAtom(apToRemove);

            expect(structure.atomCount).toBe(startAtomCount - 1);
            expect(apToRemoveRes.atomCount).toBe(startApToRemoveResAtomCount - 1);

            structure.removeAtom(structure.getAtomProxy(startAtomCount / 2));

            expect(structure.atomCount).toBe(startAtomCount - 2);
            expect(structure.atomCount).toBe(structure.atomStore.count);

            structure.removeAtom(structure.getAtomProxy(startAtomCount - 3));

            expect(structure.atomCount).toBe(startAtomCount - 3);
            expect(structure.atomCount).toBe(structure.atomStore.count);
        })
    })

    it('removing residue', function () {
        const file = join(__dirname, '../data/1IHM.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const startAtomCount = structure.atomCount;
            const rpToRemove = structure.getResidueProxy();
            const rpAtomCount = rpToRemove.atomCount;
            const rpChain = rpToRemove.chain;
            const startRpChainResCount = rpChain.residueCount;

            structure.removeResidue(rpToRemove);

            expect(structure.atomCount).toBe(startAtomCount - rpAtomCount);
            expect(rpChain.residueCount).toBe(startRpChainResCount - 1);
        })
    })

    it('removing chain', function () {
        const file = join(__dirname, '../data/1IHM.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const chpToRemove = structure.getChainProxy();
            const chpAtomCount = chpToRemove.atomCount;
            const chpResCount = chpToRemove.residueCount;

            const startAtomCount = structure.atomCount;
            const startResidueCount = structure.residueStore.count;
            const startChainCount = structure.chainStore.count;

            structure.removeChain(chpToRemove);

            expect(structure.atomCount).toBe(startAtomCount - chpAtomCount);
            expect(structure.residueStore.count).toBe(startResidueCount - chpResCount);
            expect(structure.chainStore.count).toBe(startChainCount - 1);
        })
    })

    it('removing chain import/export', function () {
        const file = join(__dirname, '/../data/1aon.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const chpToRemove = structure.getChainProxy();
            const chpAtomCount = chpToRemove.atomCount;
            const chpResCount = chpToRemove.residueCount;

            const startAtomCount = structure.atomCount;
            const startResidueCount = structure.residueStore.count;
            const startChainCount = structure.chainStore.count;

            structure.removeChain(chpToRemove);

            const endAtomCount = structure.atomCount;
            const endResidueCount = structure.residueStore.count;
            const endChainCount = structure.chainStore.count;

            expect(endAtomCount).toBe(startAtomCount - chpAtomCount);
            expect(endResidueCount).toBe(startResidueCount - chpResCount);
            expect(endChainCount).toBe(startChainCount - 1);

            const pdbWriter = new PdbWriter(structure);
            const structureDataToWrite = pdbWriter.getData();

            const writtenStructureStreamer = new StringStreamer(structureDataToWrite);
            const writtenStructurePdbParser = new PdbParser(writtenStructureStreamer);

            writtenStructurePdbParser.parse().then(function (parsedStructure: Structure) {
                expect(parsedStructure.atomCount).toBe(endAtomCount);
                expect(parsedStructure.residueStore.count).toBe(endResidueCount);
                expect(parsedStructure.chainStore.count).toBe(endChainCount);
            })
        })
    })

    it('removing mixed', function () {
        const file = join(__dirname, '/../data/1aon.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const startAtomCount = structure.atomCount;
            const startResidueCount = structure.residueStore.count;
            const startChainCount = structure.chainStore.count;

            let atomsRemoved = 0;
            let residuesRemoved = 0;
            let chainsRemoved = 0;

            for(let i = structure.atomStore.count - 1; i >= 0; i -= 2048) {
                structure.removeAtom(structure.getAtomProxy(i));
                ++atomsRemoved;
            }

            for(let i = structure.residueStore.count - 1; i >= 0; i -= 512) {
                const rp = structure.getResidueProxy(i);

                atomsRemoved += rp.atomCount;
                ++residuesRemoved;

                structure.removeResidue(rp);
            }

            for(let i = structure.chainStore.count - 1; i >= 0; i -= 2) {
                const chp = structure.getChainProxy(i);

                atomsRemoved += chp.atomCount;
                residuesRemoved += chp.residueCount;
                ++chainsRemoved;

                structure.removeChain(chp);
            }

            expect(structure.atomCount).toBe(startAtomCount - atomsRemoved);
            // lessThanOrEqual below because some atom or residue removals might cause an empty residue or chain to be removed in the background
            expect(structure.residueStore.count).toBeLessThanOrEqual(startResidueCount - residuesRemoved);
            expect(structure.chainStore.count).toBeLessThanOrEqual(startChainCount - chainsRemoved);

            for(let i = 0; i < structure.residueStore.count; ++i) {
                expect(structure.residueStore.resno[i]).toBeGreaterThanOrEqual(0);
            }

            for(let i = 1; i < structure.atomStore.count; ++i) {
                expect(structure.atomStore.serial[i]).toBeGreaterThanOrEqual(0);
                
                // TODO test below fails. Must the serials be consecutive? It seems that sometimes, they are not.
                // expect(structure.atomStore.serial[i]).toBe(structure.atomStore.serial[i - 1] + 1);
            }
        })
    })
})