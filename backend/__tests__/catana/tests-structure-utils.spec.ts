import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import { appendStructures } from '../../src/structure/structure-utils'

import { join } from 'path'
import * as fs from 'fs'
import { Structure } from '../../src/catana'

describe('catana/structure-utils', function () {
    it('appending structures', function () {
        const file1 = join(__dirname, '../data/1crn.pdb');
        const file2 = join(__dirname, '../data/1blu.pdb');

        const str1 = fs.readFileSync(file1, 'utf-8');
        const str2 = fs.readFileSync(file2, 'utf-8');

        const streamer1 = new StringStreamer(str1);
        const streamer2 = new StringStreamer(str2);

        const pdbParser1 = new PdbParser(streamer1);
        const pdbParser2 = new PdbParser(streamer2);

        return pdbParser1.parse().then(function (structure1) {
            pdbParser2.parse().then(function (structure2) {
                const totalAtomCount = structure1.atomCount + structure2.atomCount;
                const appended = appendStructures(structure1, structure2);

                expect(appended.atomCount).toBe(totalAtomCount);
            })
        })
    })

    it('structure sequence', function () {
        const file = join(__dirname, '../data/1crn.pdb');
        const str = fs.readFileSync(file, 'utf-8');
        const streamer = new StringStreamer(str);
        const pdbParser = new PdbParser(streamer);

        return pdbParser.parse().then(function (structure: Structure) {
            const seq = structure.getSequence().join("");
            expect(seq).toBe("TTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN");
        });
    });
})