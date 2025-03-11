import StringStreamer from '../../src/streamer/string-streamer'
import PdbParser from '../../src/parser/pdb-parser'
import Structure from '../../src/structure/structure'

import { join } from 'path'
import * as fs from 'fs'
import { mutateResidue } from '../../src/structure/structure-utils'

describe('catana/structure-mutation', function () {
    it('mutating residues', function () {
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
                const resIdx = 217;

                mutateResidue(srcStruct, resIdx, dstStruct, "CYS");

                let proxy = srcStruct.getResidueProxy(resIdx);

                expect(srcStruct.chainStore.count).toBe(chainCount);
                expect(srcStruct.residueStore.count).toBe(residueCount);
                expect(proxy.resname.toUpperCase()).toBe("CYS");
                expect(proxy.atomCount).toBe(6);

                mutateResidue(srcStruct, resIdx - 15, dstStruct, "CYS");

                proxy = srcStruct.getResidueProxy(resIdx - 15);

                expect(srcStruct.chainStore.count).toBe(chainCount);
                expect(srcStruct.residueStore.count).toBe(residueCount);
                expect(proxy.resname.toUpperCase()).toBe("CYS");
                expect(proxy.atomCount).toBe(6);
            });
        })
    })
})