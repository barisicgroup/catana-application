/**
 * @file Sdf Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Debug, Log, ParserRegistry } from '../globals'
import { Structure } from '../catana'
import { assignResidueTypeBonds } from '../structure/structure-utils'
import StructureParser from './structure-parser'

const reItem = /> +<(.+)>/

class SdfParser extends StructureParser {
  get type() { return 'sdf' }

  _parse() {
    // https://en.wikipedia.org/wiki/Chemical_table_file#SDF
    // http://download.accelrys.com/freeware/ctfile-formats/ctfile-formats.zip

    if (Debug) Log.time('SdfParser._parse ' + this.name)

    const s = this.structure
    const sb = this.structureBuilder

    const firstModelOnly = this.firstModelOnly
    const asTrajectory = this.asTrajectory

    const headerLines = this.streamer.peekLines(2)

    s.id = headerLines[0].trim()
    s.title = headerLines[1].trim()

    const frames = s.frames
    let doFrames = false
    let currentFrame: Float32Array, currentCoord: number

    const atomMap = s.atomMap
    const atomStore = s.atomStore
    atomStore.resize(Math.round(this.streamer.data.length / 50))
    atomStore.addField('formalCharge', 1, 'int8')

    const ap1 = s.getAtomProxy()
    const ap2 = s.getAtomProxy()

    let idx = 0
    let lineNo = 0
    let modelIdx = 0
    let modelAtomIdxStart = 0
    let containsPhosphorus = false;
    const elementsNames: { [k: number]: string } = []

    const sdfData: { [k: string]: string[] }[] = []
    let currentItem: string | boolean = false
    let currentData: { [k: string]: string[] } = {}
    let mItem
    s.extraData.sdf = sdfData

    let atomCount, bondCount, atomStart: number, atomEnd: number, bondStart: number, bondEnd: number
    // Functions below are stored as variables because
    const aminoAcidAutoNameFunc = this.autonameAsAminoAcid;
    const nucleicAcidAutoNameFunc = this.autonameAsNucleicAcid;

    function _parseChunkOfLines(_i: number, _n: number, lines: string[], nameAtomsBasedOnBonds: boolean = false) {
      let indicesToProcess: number[] = [];

      for (let i = _i; i < _n; ++i) {
        const line = lines[i]

        if (line.substr(0, 4) === '$$$$') {
          lineNo = -1
          ++modelIdx
          modelAtomIdxStart = atomStore.count
          sdfData.push(currentData)
          currentData = {}
          currentItem = false
        } else if (lineNo === 3) {
          atomCount = parseInt(line.substr(0, 3))
          bondCount = parseInt(line.substr(3, 3))

          atomStart = 4
          atomEnd = atomStart + atomCount
          bondStart = atomEnd
          bondEnd = bondStart + bondCount

          if (asTrajectory) {
            currentCoord = 0
            currentFrame = new Float32Array(atomCount * 3)
            frames.push(currentFrame)

            if (modelIdx > 0) doFrames = true
          }
        } else if (lineNo >= atomStart && lineNo < atomEnd) {
          if (firstModelOnly && modelIdx > 0) continue

          const x = parseFloat(line.substr(0, 10))
          const y = parseFloat(line.substr(10, 10))
          const z = parseFloat(line.substr(20, 10))

          if (asTrajectory) {
            const j = currentCoord * 3

            currentFrame[j + 0] = x
            currentFrame[j + 1] = y
            currentFrame[j + 2] = z

            currentCoord += 1

            if (doFrames) continue
          }

          atomStore.growIfFull()
          const element = line.substr(31, 3).trim()

          if (nameAtomsBasedOnBonds) {
            elementsNames[idx] = element;
          }
          else {
            const atomname = element + (idx + 1)
            atomStore.atomTypeId[idx] = atomMap.add(atomname, element)
          }

          if (element === 'P') {
            containsPhosphorus = true;
          }

          atomStore.x[idx] = x
          atomStore.y[idx] = y
          atomStore.z[idx] = z
          atomStore.serial[idx] = idx
          atomStore.formalCharge[idx] = 0

          sb.addAtom(modelIdx, '', '', 'HET', 1, 1)

          indicesToProcess.push(idx);
          idx += 1
        } else if (lineNo >= bondStart && lineNo < bondEnd) {
          if (firstModelOnly && modelIdx > 0) continue
          if (asTrajectory && modelIdx > 0) continue

          ap1.index = parseInt(line.substr(0, 3)) - 1 + modelAtomIdxStart
          ap2.index = parseInt(line.substr(3, 3)) - 1 + modelAtomIdxStart
          const order = parseInt(line.substr(6, 3))

          s.bondStore.addBond(ap1, ap2, order)
        } else if (line.match(/M {2}CHG/)) {
          const chargeCount = parseInt(line.substr(6, 3))
          for (let ci = 0, coffset = 10; ci < chargeCount; ++ci, coffset += 8) {
            const aToken = parseInt(line.substr(coffset, 3))
            const atomIdx = aToken - 1 + modelAtomIdxStart
            const cToken = parseInt(line.substr(coffset + 4, 3))
            atomStore.formalCharge[atomIdx] = cToken
          }
          // eslint-disable-next-line no-cond-assign
        } else if (mItem = line.match(reItem)) {
          currentItem = mItem[1]
          currentData[currentItem] = []
        } else if (currentItem !== false && line) {
          currentData[<string>currentItem].push(line)
        }

        ++lineNo
      }

      // Naming based on bonds is a CATANA software extension of the parser.
      // The goal is to use the parsed information to give the atoms a more
      // descriptive name (e.g. CA for alpha carbon) instead of generic "<element><id>"
      // --
      // Currently works for nucleic acids and amino acids.
      // Distinguishing between these two is done based on (non)existence of P atom.
      // This expects that the whole nucleotide compound including phosphate is contained.
      // 
      // TODO: Only DNA nucleotide is expected at the moment, the naming may fail with RNA!
      if (nameAtomsBasedOnBonds) {
        if (containsPhosphorus) {
          nucleicAcidAutoNameFunc(s, indicesToProcess, elementsNames);
        }
        else {
          aminoAcidAutoNameFunc(s, indicesToProcess, elementsNames);
        }
      }
    }

    // Naming of atoms in a "more clever way" now works only with one chunk
    // as it needs all data to be read at once to be able to gather necessary information
    const nameAtomsBasedOnBonds = this.streamer.chunkCount() === 1;
    this.streamer.eachChunkOfLines(function (lines/*, chunkNo, chunkCount */) {
      _parseChunkOfLines(0, lines.length, lines, nameAtomsBasedOnBonds)
    })

    sb.finalize()
    s.finalizeAtoms()
    s.finalizeBonds()
    assignResidueTypeBonds(s)

    if (Debug) Log.timeEnd('SdfParser._parse ' + this.name)
  }

  _postProcess() {
    assignResidueTypeBonds(this.structure)
  }

  // CATANA extensions
  private autonameAsAminoAcid(s: Structure, indicesToProcess: number[], elementsNames: { [k: number]: string }): boolean {
    const atomMap = s.atomMap;
    const atomStore = s.atomStore;
    const suggestedAtomNames = new Array<string>(indicesToProcess.length);

    // During the first iteration, we identify the important elements / names
    // based on analysing the individual atoms and their bonds
    for (let i = 0; i < indicesToProcess.length; ++i) {
      const atomIdx = indicesToProcess[i];
      const element = elementsNames[atomIdx];

      if (_canBeAlphaCarbon(element, atomIdx)) {
        suggestedAtomNames[i] = "CA";
      } else if (_canBeCarbonOfCarboxylGroup(element, atomIdx)) {
        suggestedAtomNames[i] = "C";
      } else if (_canBeNitrogenOfAminoGroup(element, atomIdx)) {
        suggestedAtomNames[i] = "N";
      } else if (_canBeOxygenOrderTwoOfCarboxylGroup(element, atomIdx)) {
        suggestedAtomNames[i] = "O";
      } else {
        suggestedAtomNames[i] = "";
      }

      function _canBeOxygenOrderTwoOfCarboxylGroup(element: string, atomIdx: number): boolean {
        if (element !== "O") {
          return false;
        }

        for (let j = 0; j < s.bondStore.count; ++j) {
          if (s.bondStore.bondOrder[j] === 2) {
            let otherElemName = undefined;
            let otherElemIdx = undefined;

            if (s.bondStore.atomIndex1[j] === atomIdx) {
              otherElemIdx = s.bondStore.atomIndex2[j];
              otherElemName = elementsNames[otherElemIdx];
            } else if (s.bondStore.atomIndex2[j] === atomIdx) {
              otherElemIdx = s.bondStore.atomIndex1[j];
              otherElemName = elementsNames[otherElemIdx];
            }

            if (otherElemName && otherElemIdx && _canBeCarbonOfCarboxylGroup(otherElemName, otherElemIdx)) {
              return true;
            }
          }
        }

        return false;
      }

      function _canBeCarbonOfCarboxylGroup(element: string, atomIdx: number): boolean {
        let hasBondToOxygenOfOrderTwo = false;
        let hasBondToOHGroupOxygen = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;
          let otherElemIdx = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex2[j];
            otherElemName = elementsNames[otherElemIdx];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex1[j];
            otherElemName = elementsNames[otherElemIdx];
          }

          if (otherElemName === "O") {
            if (s.bondStore.bondOrder[j] === 2) {
              hasBondToOxygenOfOrderTwo = true;
            } else if (s.bondStore.bondOrder[j] === 1) {
              // Has bond to O of order one
              // Let's check that the given O has bond to H
              for (let k = 0; k < s.bondStore.count; ++k) {
                hasBondToOHGroupOxygen = hasBondToOHGroupOxygen || (s.bondStore.atomIndex1[k] === otherElemIdx && elementsNames[s.bondStore.atomIndex2[k]] === "H") ||
                  (s.bondStore.atomIndex2[k] === otherElemIdx && elementsNames[s.bondStore.atomIndex1[k]] === "H");
              }
            }
          }
        }

        return element === "C" && hasBondToOxygenOfOrderTwo && hasBondToOHGroupOxygen;
      }

      function _canBeAlphaCarbon(element: string, atomIdx: number): boolean {
        let hasBondToCarboxylGroupCarbon = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          if (s.bondStore.atomIndex1[j] === atomIdx) {
            hasBondToCarboxylGroupCarbon = hasBondToCarboxylGroupCarbon || _canBeCarbonOfCarboxylGroup(elementsNames[s.bondStore.atomIndex2[j]],
              s.bondStore.atomIndex2[j]);
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            hasBondToCarboxylGroupCarbon = hasBondToCarboxylGroupCarbon || _canBeCarbonOfCarboxylGroup(elementsNames[s.bondStore.atomIndex1[j]],
              s.bondStore.atomIndex1[j]);
          }
        }

        return element === "C" && hasBondToCarboxylGroupCarbon;
      }

      function _canBeNitrogenOfAminoGroup(element: string, atomIdx: number): boolean {
        let hydrogenBondsCount = 0;
        let hasBondToAlphaCarbon = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;
          let otherElemIdx = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex2[j];
            otherElemName = elementsNames[otherElemIdx];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex1[j];
            otherElemName = elementsNames[otherElemIdx];
          }

          if (otherElemName === "H") {
            ++hydrogenBondsCount;
          } else if (otherElemName && otherElemIdx && _canBeAlphaCarbon(otherElemName, otherElemIdx)) {
            hasBondToAlphaCarbon = true;
          }
        }

        // The hydrogen bound count is compared just to one and not two because of the proline
        // which does not have NH2 group but only NH
        return element === "N" && hydrogenBondsCount >= 1 && hasBondToAlphaCarbon;
      }
    }

    // During the second iteration, elements which were given a name during the 
    // first iteration are checked for bonds between them.
    // The name is preserved only for those who are  part of a N-CA-C(=O) backbone.
    const consecutiveBackboneBondSeq: string[] = ["N", "CA", "C", "O"];

    for (let i = 0; i < indicesToProcess.length; ++i) {
      const thisAtomName = suggestedAtomNames[i];
      let resultingIndices: number[] = [];

      if (_isStartOfConsecutiveBondedSequence(consecutiveBackboneBondSeq, 0, thisAtomName, i, resultingIndices)) {
        for (let j = 0; j < suggestedAtomNames.length; ++j) {
          if (resultingIndices.indexOf(j) < 0) {
            suggestedAtomNames[j] = "";
          }
        }
      }

      function _isStartOfConsecutiveBondedSequence(seqElements: string[], currSeqIdx: number, atomName: string, arrayIdx: number, seqIndicesToFill: number[]): boolean {
        if (atomName !== seqElements[currSeqIdx]) {
          seqIndicesToFill = [];
          return false;
        } else if (atomName === seqElements[currSeqIdx] && currSeqIdx === seqElements.length - 1) {
          seqIndicesToFill.push(arrayIdx);
          return true;
        }

        let indicesToAdd: number[] = [];

        for (let j = 0; j < indicesToProcess.length; ++j) {
          indicesToAdd = [];

          if (_hasBondTo(indicesToProcess[arrayIdx], indicesToProcess[j]) &&
            _isStartOfConsecutiveBondedSequence(seqElements, currSeqIdx + 1, suggestedAtomNames[j], j, indicesToAdd)) {
            indicesToAdd.push(arrayIdx);
            break;
          }
        }

        for (let j = 0; j < indicesToAdd.length; ++j) {
          seqIndicesToFill.push(indicesToAdd[j]);
        }

        return indicesToAdd.length > 0;
      }

      function _hasBondTo(thisAtomIdx: number, otherAtomIdx: number): boolean {
        for (let j = 0; j < s.bondStore.count; ++j) {
          if ((s.bondStore.atomIndex1[j] === thisAtomIdx && s.bondStore.atomIndex2[j] === otherAtomIdx) ||
            (s.bondStore.atomIndex1[j] === otherAtomIdx && s.bondStore.atomIndex2[j] === thisAtomIdx)) {
            return true;
          }
        }

        return false;
      }
    }

    let atomNamesIdentified = 0;
    // During the third iteration, final names are assigned
    for (let i = 0; i < indicesToProcess.length; ++i) {
      const atomIdx = indicesToProcess[i];
      const element = elementsNames[atomIdx];
      let atomName = suggestedAtomNames[i].length > 0 ? suggestedAtomNames[i] : element + atomIdx.toString();
      atomStore.atomTypeId[atomIdx] = atomMap.add(atomName, element);

      atomNamesIdentified += suggestedAtomNames[i].length > 0 ? 1 : 0;
    }

    return atomNamesIdentified >= 4;
  }

  private autonameAsNucleicAcid(s: Structure, indicesToProcess: number[], elementsNames: { [k: number]: string }): boolean {
    const atomMap = s.atomMap;
    const atomStore = s.atomStore;
    const suggestedAtomNames = new Array<string>(indicesToProcess.length);

    // First, identify the key atoms and assign their names
    for (let i = 0; i < indicesToProcess.length; ++i) {
      const atomIdx = indicesToProcess[i];
      const element = elementsNames[atomIdx];

      if (_isUniqueElement(element)) {
        suggestedAtomNames[i] = element;
      } else if (_isThreePrimeOxygen(element, atomIdx)) {
        suggestedAtomNames[i] = "O3'";
      } else if (_isOxygenInCycle(element, atomIdx)) {
        suggestedAtomNames[i] = "O4'";
      } else if (_isThreePrimeCarbon(element, atomIdx)) {
        suggestedAtomNames[i] = "C3'";
      } else if (_isTwoPrimeCarbon(element, atomIdx)) {
        suggestedAtomNames[i] = "C2'";
      } else {
        suggestedAtomNames[i] = "";
      }

      function _isUniqueElement(element: string) {
        let count = 0;

        for (let j = 0; j < indicesToProcess.length; ++j) {
          if (elementsNames[indicesToProcess[j]] === element) {
            ++count;
          }
        }

        return count === 1;
      }

      // Returns true if the given atom is O from the sugar's 3' hydroxyl group
      function _isThreePrimeOxygen(element: string, atomIdx: number): boolean {
        if (element !== "O") {
          return false;
        }

        let hasBondToCarbon = false;
        let hasBondToHydrogen = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemName = elementsNames[s.bondStore.atomIndex2[j]];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemName = elementsNames[s.bondStore.atomIndex1[j]];
          }

          if (otherElemName && s.bondStore.bondOrder[j] === 1) {
            if (otherElemName === "C") {
              hasBondToCarbon = true;
            } else if (otherElemName === "H") {
              hasBondToHydrogen = true;
            }
          }
        }

        return hasBondToCarbon && hasBondToHydrogen;
      }

      function _isOxygenInCycle(element: string, atomIdx: number): boolean {
        if (element !== "O") {
          return false;
        }

        let carbonBondCount = 0;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemName = elementsNames[s.bondStore.atomIndex2[j]];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemName = elementsNames[s.bondStore.atomIndex1[j]];
          }

          if (otherElemName && s.bondStore.bondOrder[j] === 1) {
            if (otherElemName === "C") {
              ++carbonBondCount;
            }
          }
        }

        return carbonBondCount === 2;
      }

      function _isThreePrimeCarbon(element: string, atomIdx: number): boolean {
        if (element !== "C") {
          return false;
        }

        let hasBondToThreePrimeOxygen = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;
          let otherElemIdx = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex2[j];
            otherElemName = elementsNames[otherElemIdx];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex1[j];
            otherElemName = elementsNames[otherElemIdx];
          }

          if (otherElemName && otherElemIdx &&
            // TODO Optimize all of the ugly duplication and methods like _isThreePrimeOxygen below which are computed over and over again with same parameters
            _isThreePrimeOxygen(otherElemName, otherElemIdx) && s.bondStore.bondOrder[j] === 1) {
            hasBondToThreePrimeOxygen = true;
            break;
          }
        }

        return hasBondToThreePrimeOxygen;
      }

      function _isTwoPrimeCarbon(element: string, atomIdx: number): boolean {
        if (element !== "C") {
          return false;
        }

        let hasBondToThreePrimeCarbon = false;
        let hasBondToOxygenInCycle = false;

        for (let j = 0; j < s.bondStore.count; ++j) {
          let otherElemName = undefined;
          let otherElemIdx = undefined;

          if (s.bondStore.atomIndex1[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex2[j];
            otherElemName = elementsNames[otherElemIdx];
          } else if (s.bondStore.atomIndex2[j] === atomIdx) {
            otherElemIdx = s.bondStore.atomIndex1[j];
            otherElemName = elementsNames[otherElemIdx];
          }

          if (otherElemName && otherElemIdx && s.bondStore.bondOrder[j] === 1) {
            if (_isOxygenInCycle(otherElemName, otherElemIdx)) {
              hasBondToOxygenInCycle = true;
            } else if (_isThreePrimeCarbon(otherElemName, otherElemIdx)) {
              hasBondToThreePrimeCarbon = true;
            }
          }
        }

        return hasBondToThreePrimeCarbon && !hasBondToOxygenInCycle;
      }
    }

    // Do the final name assignment to the structure's data structures
    let atomNamesIdentified = 0;
    for (let i = 0; i < indicesToProcess.length; ++i) {
      const atomIdx = indicesToProcess[i];
      const element = elementsNames[atomIdx];
      let atomName = suggestedAtomNames[i].length > 0 ? suggestedAtomNames[i] : element + atomIdx.toString();
      atomStore.atomTypeId[atomIdx] = atomMap.add(atomName, element);

      atomNamesIdentified += suggestedAtomNames[i].length > 0 ? 1 : 0;
    }

    return atomNamesIdentified >= 5;
  }
}

ParserRegistry.add('sdf', SdfParser)
ParserRegistry.add('sd', SdfParser)
ParserRegistry.add('mol', SdfParser)

export default SdfParser
