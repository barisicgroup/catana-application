/**
 * @file Align Utils
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import Structure from '../structure/structure';
import Filter from '../filtering/filter';
import Alignment, { SubstitutionMatrix } from './alignment';
import Superposition from './superposition';
import CgStructure from '../catana/data_model/cg-structure';
import { MonomerType, monomerTypeToOneLetterCode } from '../catana/data_model/types_declarations/monomer-types';
import CgPolymer from '../catana/data_model/cg-polymer';
import ResidueProxy from '../proxy/residue-proxy';
import StructureView from '../structure/structure-view';

/**
 * Perform structural superposition of two structures,
 * optionally guided by a sequence alignment
 * @param  {Structure|StructureView} s1 - structure 1 which is superposed onto structure 2
 * @param  {Structure|StructureView} s2 - structure 2 onto which structure 1 is superposed
 * @param  {Boolean} [align] - guide the superposition by a sequence alignment
 * @param  {String} [filt1] - filter string for structure 1
 * @param  {String} [filt2] - filter string for structure 2
 * @return {undefined}
 */
function superpose(s1: Structure | CgStructure, s2: Structure | CgStructure, align = false, filt1 = '', filt2 = '') {
  let i: number;
  let j: number;
  let n: number;
  let positions1: Float32Array;
  let positions2: Float32Array;

  if (align) {
    // If "alignOnProteins" set to true, the sequences will be aligned based on the amino acid sequence.
    // Otherwise, they are aligned based on the nucleic acid sequence.
    // --
    // This solution is chosen because aligning based on full sequence would not be well supported
    // by the current superposition algorithm due to the usage of single-letter amino & nucleic acid codes -- and these codes overlap.
    // Other reason is that the individual chains might not be ordered the same way in the sequences, thus resulting in difficult
    // to align sequences (first sequence might have residues listed as AAAAAABBBB, the other as BBBBAAAAAA, for example -- this is a "no go" for alignment).
    // This maybe a cause primarily in the comparison of coarse-grained and all-atom structures.
    // In any case, aligning based purely on amino acid residues or nucleic acid residues seems to be a better option now. 
    const alignOnProteins: boolean = checkProteinBasedAlignment(s1, s2);

    let sSeq1 = getStrucSeq(s1, filt1, alignOnProteins);
    let sSeq2 = getStrucSeq(s2, filt2, alignOnProteins);

    let _s1 = sSeq1[0];
    let _s2 = sSeq2[0];

    let seq1: string[] = sSeq1[1];
    let seq2: string[] = sSeq2[1];

    //console.log(alignOnProteins ? "Protein-based alignment;" : "DNA-based alignment;", s1.name, "onto", s2.name);
    //console.log(seq1.join(""));
    //console.log(seq2.join(""));

    let gapPenalty = -10;
    let gapExtensionPenalty = -1;
    let scoringMatrix: SubstitutionMatrix = "blosum62";

    if (!alignOnProteins) {
      gapPenalty = -20;
      gapExtensionPenalty = -0.5;
      scoringMatrix = "ednaFull";
    }

    const ali = new Alignment(seq1.join(""), seq2.join(""), gapPenalty, gapExtensionPenalty, scoringMatrix);

    ali.calc();
    ali.trace();

    //console.log("superpose alignment score", ali.score);

    //console.log(ali.ali1);
    //console.log(ali.ali2);
    //console.log(ali.S);

    let _i, _j;
    i = 0;
    j = 0;
    n = ali.ali1.length;
    const aliIdx1: boolean[] = [];
    const aliIdx2: boolean[] = [];

    for (let l = 0; l < n; ++l) {
      const x = ali.ali1[l];
      const y = ali.ali2[l];

      _i = 0;
      _j = 0;

      if (x === '-') {
        aliIdx2[j] = false;
      } else {
        aliIdx2[j] = true;
        _i = 1
      }

      if (y === '-') {
        aliIdx1[i] = false;
      } else {
        aliIdx1[i] = true;
        _j = 1;
      }

      i += _i;
      j += _j;
    }

    //console.log(i, j);
    //console.log(aliIdx1);
    //console.log(aliIdx2);

    const _positions1: number[] = [];
    const _positions2: number[] = [];

    fillPositions(_s1, _positions1, aliIdx1, alignOnProteins);
    fillPositions(_s2, _positions2, aliIdx2, alignOnProteins);

    positions1 = new Float32Array(_positions1);
    positions2 = new Float32Array(_positions2);
  } else {
    const _positions1: number[] = [];
    const _positions2: number[] = [];

    let _s1 = s1;
    let _s2 = s2;

    if (s1 instanceof Structure) {
      _s1 = s1.getView(new Filter(`${filt1} and .CA`));
    }

    if (s2 instanceof Structure) {
      _s2 = s2.getView(new Filter(`${filt2} and .CA`));
    }

    fillPositions(_s1, _positions1);
    fillPositions(_s2, _positions2);

    positions1 = new Float32Array(_positions1);
    positions2 = new Float32Array(_positions2);
  }

  const superpose = new Superposition(positions1, positions2);
  let result = superpose.transform(s1);

  if (s1 instanceof Structure) {
    s1.refreshPosition();
  }

  return result;
}

function getStrucSeq(struc: Structure | CgStructure, filt: string, alignOnProteins: boolean): [Structure | CgStructure, string[]] {
  let _s = struc;
  let seq: string[];

  if (struc instanceof Structure) {
    if (filt) {
      _s = struc.getView(new Filter(filt));
    }
    seq = (_s as StructureView).getSequenceFormatted((rp: ResidueProxy) => {
      const code = rp.getResname1();
      // If aligning on protein-level, only amino-acid sequence is extracted.
      // The same holds for aligning on nucleotide-level.
      return alignOnProteins ? (rp.isProtein() ? code : "") : (rp.isNucleic() ? code : "");
    });
  } else {
    // TODO Filtering is currently ignored for coarse-grained structures
    seq = (_s as CgStructure).getSequenceFormatted(
      (t: MonomerType, pol: CgPolymer) => {
        const code = monomerTypeToOneLetterCode(t);
        return alignOnProteins ? (pol.isProtein() ? code : "") : (pol.isNucleic() ? code : "");
      });
  }

  return [_s, seq];
};

function fillPositions(struc: Structure | CgStructure, positions: number[], aliIdx?: boolean[], alignOnProteins?: boolean): void {
  let i = 0;

  if (struc instanceof Structure) {
    let ap = struc.getAtomProxy();

    struc.eachResidue(function (r) {
      if (r.traceAtomIndex === undefined ||
        (alignOnProteins !== undefined && (
          (alignOnProteins && !r.isProtein()) ||
          (!alignOnProteins && !r.isNucleic())
        )
        )) {
        return;
      }

      if (aliIdx !== undefined ? (aliIdx[i] ?? false) : true) {
        ap.index = r.traceAtomIndex;
        positions.push(ap.x, ap.y, ap.z);
      }

      ++i;
    });
  } else {
    struc.forEachMonomer(function (m) {
      if (alignOnProteins !== undefined && (
        (alignOnProteins && !m.getParentPolymer().isProtein()) ||
        (!alignOnProteins && !m.getParentPolymer().isNucleic()))) {
        return;
      }

      if (aliIdx !== undefined ? (aliIdx[i] ?? false) : true) {
        const pos = m.position;
        positions.push(pos.x, pos.y, pos.z);
      }

      ++i;
    });
  }
}

function checkProteinBasedAlignment(s1: Structure | CgStructure, s2: Structure | CgStructure): boolean {
  // TODO Computation of the ratio currently ignores filters
  //      Therefore, the ratio might be incorrect with regards to the data used for superposition

  const getNucleicAcidRatio = (s: Structure | CgStructure) => {
    let proteinElements = 0;
    let nucleicElements = 0;

    if (s instanceof Structure) {
      s.eachPolymer(pol => {
        nucleicElements += pol.isNucleic() ? pol.residueCount : 0;
        proteinElements += pol.isProtein() ? pol.residueCount : 0;
      });
    } else {
      s.forEachPolymer(pol => {
        nucleicElements += pol.isNucleic() ? pol.length : 0;
        proteinElements += pol.isProtein() ? pol.length : 0;
      });
    }

    return proteinElements > 0 ? (nucleicElements > 0 ? nucleicElements / proteinElements : -Infinity) : Infinity;
  }

  return getNucleicAcidRatio(s1) + getNucleicAcidRatio(s2) - 2.0 < 0.0;
}

export {
  superpose
}
