import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import Structure from '../../src/structure/structure'

import { join } from 'path'
import * as fs from 'fs'
import { appendResiduesToChain } from '../../src/structure/structure-utils'

describe('catana/structure-append', function () {
    it('appending residues', function () {
        const srcFile = join(__dirname, "../data/3pqr.pdb");
        const srcStr = fs.readFileSync(srcFile, "utf-8");
        const srcStreamer = new StringStreamer(srcStr);
        const srcPdbParser = new PdbParser(srcStreamer);

        const dstFile = join(__dirname, "../data/cys.pdb");
        const dstStr = fs.readFileSync(dstFile, "utf-8");
        const dstStreamer = new StringStreamer(dstStr);
        const dstPdbParser = new PdbParser(dstStreamer);

        return srcPdbParser.parse().then(function (srcStruct: Structure) {
            return dstPdbParser.parse().then(function (dstStruct: Structure) {
                const chainCount = srcStruct.chainStore.count;
                const residueCount = srcStruct.residueStore.count;
                const atomCount = srcStruct.atomCount;

                appendResiduesToChain(srcStruct, 0, dstStruct, "N", 3, "CYS");
                appendResiduesToChain(srcStruct, 0, dstStruct, "C", 3, "CYS");

                expect(srcStruct.chainStore.count).toBe(chainCount);
                expect(srcStruct.residueStore.count).toBe(residueCount + 6);
                expect(srcStruct.atomCount).toBe(atomCount + 6 * 6);
            });
        })
    })
})