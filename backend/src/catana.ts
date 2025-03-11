/**
 * @file catana
 * @private
 * @author Alexander Rose <alexander.rose@weirdbyte.de>, Catana team
 */

import './polyfills'
import _Promise from 'promise-polyfill'

/**
 * The CATANA module. These members are available in the `CATANA` namespace when using the {@link https://github.com/umdjs/umd|UMD} build in the `catana.js` file.
 * @module CATANA
 */

export {
  Debug, setDebug,
  MeasurementDefaultParams, setMeasurementDefaultParams,
  ScriptExtensions, ColormakerRegistry, PluginExtension,
  DatasourceRegistry, DecompressorRegistry,
  ParserRegistry, RepresentationRegistry,
  setListingDatasource, setTrajectoryDatasource,
  ListingDatasource, TrajectoryDatasource, Log

  /* Catana registries */,
  CoarseGrainedRepresentationRegistry,
  ExampleRegistry

} from './globals'
export { autoLoad, getDataInfo, getFileInfo } from './loader/loader-utils'
import Filter from './filtering/filter'
import { getSuggestions, applySuggestion, getKeywords } from "./filtering/filtering-autocompleter" // Catana addition
import {
  addComponentFromSequence, getAminoAcidSequenceType, threeLetterToOneLetter, oneLetterToThreeLetter,
  PROTEIN_VALUES_THREE_LETTER, PROTEIN_VALUES_ONE_LETTER, DNA_VALUES
} from "./catana/utils/catana-sequence-utils"; // Catana addition
import * as chroma from "chroma-js" // Catana addition
import PdbWriter from './writer/pdb-writer'
import SdfWriter from './writer/sdf-writer'
import StlWriter from './writer/stl-writer'
import Stage, { StageLoadFileParams } from './stage/stage'
import Collection from './component/collection'
import ComponentCollection from './component/component-collection'
import Component from './component/component'
import ShapeComponent from './component/shape-component'
import StructureComponent, { StructureRepresentationType } from './component/structure-component'
import SurfaceComponent from './component/surface-component'
import VolumeComponent from './component/volume-component'
import RepresentationCollection from './component/representation-collection'
import Assembly from './symmetry/assembly'
import TrajectoryPlayer from './trajectory/trajectory-player'
import Superposition from './align/superposition'
export { superpose } from './align/align-utils'
export { guessElement, concatStructures } from './structure/structure-utils'

export { flatten, throttle, download, getQuery, uniqueArray } from './utils'
import Queue from './utils/queue'
import Counter from './utils/counter'
import Frames from './trajectory/frames'

//

import Colormaker from './color/colormaker'

import './color/atomindex-colormaker'
import './color/bfactor-colormaker'
import './color/chainid-colormaker'
import './color/chainindex-colormaker'
import './color/chainname-colormaker'
import './color/densityfit-colormaker'
import './color/electrostatic-colormaker'
import './color/element-colormaker'
import './color/entityindex-colormaker'
import './color/entitytype-colormaker'
import './color/geoquality-colormaker'
import './color/hydrophobicity-colormaker'
import './color/modelindex-colormaker'
import './color/moleculetype-colormaker'
import './color/occupancy-colormaker'
import './color/partialcharge-colormaker'
import './color/random-colormaker'
import './color/randomcoilindex-colormaker'
import './color/residueindex-colormaker'
import './color/resname-colormaker'
import './color/sstruc-colormaker'
import './color/uniform-colormaker'
import './color/value-colormaker'
import './color/volume-colormaker'

//

import './component/shape-component'
import './component/structure-component'
import './component/surface-component'
import './component/volume-component'

//

import './representation/angle-representation'
import './representation/axes-representation'
import './representation/backbone-representation'
import './representation/ballandstick-representation'
import './representation/base-representation'
import './representation/cartoon-representation'
import './representation/contact-representation'
import './representation/dihedral-representation'
import './representation/dihedral-histogram-representation'
import './representation/distance-representation'
import './representation/helixorient-representation'
import './representation/hyperball-representation'
import './representation/label-representation'
import './representation/licorice-representation'
import './representation/line-representation'
import './representation/molecularsurface-representation'
import './representation/point-representation'
import './representation/ribbon-representation'
import './representation/rocket-representation'
import './representation/rope-representation'
import './representation/spacefill-representation'
import './representation/trace-representation'
import './representation/tube-representation'
import './representation/unitcell-representation'
import './representation/validation-representation'

import BufferRepresentation from './representation/buffer-representation'
import ArrowBuffer from './buffer/arrow-buffer'
import BoxBuffer from './buffer/box-buffer'
import ConeBuffer from './buffer/cone-buffer'
import CylinderBuffer from './buffer/cylinder-buffer'
import EllipsoidBuffer from './buffer/ellipsoid-buffer'
import MeshBuffer from './buffer/mesh-buffer'
import OctahedronBuffer from './buffer/octahedron-buffer'
import PointBuffer from './buffer/point-buffer'
import SphereBuffer from './buffer/sphere-buffer'
import TetrahedronBuffer from './buffer/tetrahedron-buffer'
import TextBuffer from './buffer/text-buffer'
import TorusBuffer from './buffer/torus-buffer'
import WidelineBuffer from './buffer/wideline-buffer'

//

import './parser/cif-parser'
import './parser/gro-parser'
import './parser/mmtf-parser'
import './parser/mol2-parser'
import './parser/pdb-parser'
import './parser/pdbqt-parser'
import './parser/pqr-parser'
import './parser/sdf-parser'

import './parser/prmtop-parser'
import './parser/psf-parser'
import './parser/top-parser'

import './parser/dcd-parser'
import './parser/nctraj-parser'
import './parser/trr-parser'
import './parser/xtc-parser'

import './parser/cube-parser'
import './parser/dsn6-parser'
import './parser/dx-parser'
import './parser/dxbin-parser'
import './parser/mrc-parser'
import './parser/xplor-parser'

import './parser/kin-parser'
import './parser/obj-parser'
import './parser/ply-parser'

import './parser/csv-parser'
import './parser/json-parser'
import './parser/msgpack-parser'
import './parser/netcdf-parser'
import './parser/text-parser'
import './parser/xml-parser'

import './parser/validation-parser'

//

import Shape from './geometry/shape'
import Kdtree from './geometry/kdtree'
import SpatialHash from './geometry/spatial-hash'
import Structure from './structure/structure'
import MolecularSurface from './surface/molecular-surface'
import Volume from './surface/volume'

//

import './utils/gzip-decompressor'

//

import './datasource/rcsb-datasource'
import './datasource/pubchem-datasource'
import './datasource/passthrough-datasource'
import StaticDatasource from './datasource/static-datasource'
import MdsrvDatasource from './datasource/mdsrv-datasource'

//

export {
  LeftMouseButton, MiddleMouseButton, RightMouseButton
} from './constants'
import MouseActions from './controls/mouse-actions'
import KeyActions from './controls/key-actions'
import PickingProxy from './controls/picking-proxy'

//

export { Signal } from 'signals'
export {
  Matrix3, Matrix4, Vector2, Vector3, Box3, Quaternion, Euler, Plane, Color, MathUtils
} from 'three'

//

import Version from './version'

// Catana stuff
import { CatanaActions } from "./catana/actions/catana-actions"
import "./catana/datasource/catana-datasource"
import { CatanaProteinActions } from "./catana/actions/catana-protein-actions"
import CgNucleicAcidCreateState from "./catana/actions/cg-nucleic-acid-create-state"
import CreateLatticeState from "./catana/actions/lattice-create-state";
import CgRemoveState from "./catana/actions/cg-remove-state";
import CgNucleicAcidConnectState from "./catana/actions/cg-nucleic-acid-connect-state";
import CgNucleicAcidExtendState from "./catana/actions/cg-nucleic-acid-extend-state";
import ProteinRemoveState from "./catana/actions/protein-remove-state";
import CatanaStateData from "./catana/actions/catana-state-data";
import ProteinAddAminoAcidsState from "./catana/actions/protein-add-amino-acids-state";
import ProteinMutateAminoAcidState from "./catana/actions/protein-mutate-amino-acid-state";
import MoveState from "./catana/actions/move-state";
import CenterState from "./catana/actions/center-state";
import { GizmoMode } from "./catana/visualizations/gizmos-transform";

// Parsers
import "./catana/parsers/unf-parser";
import "./catana/parsers/cadnano-parser";

// Color makers
import "./catana/color/cg-custom-color-maker";
import "./catana/color/cg-start-end-gradient-color-maker";
import "./catana/color/cg-crossover-color-maker";

// Representations
import "./catana/representation/structure/cg-structure-atomic-representation";
import "./catana/representation/structure/cg-structure-double-strand-representation";
import "./catana/representation/structure/cg-structure-monomer-representation";
import "./catana/representation/structure/cg-structure-tube-representation";
import "./catana/representation/structure/martini-cg-representation";

// Other
import "./catana/datasource/afold-ebi-ac-db";
import "./catana/datasource/alphafill-datasource";
import "./catana/examples/active-examples";



import { mergeStructureComponentsIntoOne, mergeComponentsContainingStructureIntoOne, duplicateComponentContainingStructure, mergeStructures, appendAnyStructureComps, convertCgStrucCompToAaStrucComp, convertAaStrucCompToCgStrucComp } from './catana/utils/catana-utils'
import MultiObjectsStorage from './catana/utils/multi-objects-storage'
import UnfWriter from './catana/writer/unf-writer'
import { LatticeType } from './catana/nanomodeling/lattices/lattice'
import { ParserParametersRegistry } from "./globals";
import CgNucleicAcidChangeTypeState from "./catana/actions/cg-nucleic-acid-change-type-state";
import { FastaSequenceProvider } from './catana/nanomodeling/sequence-providers/fasta-sequence-provider'
import { RandomNaSequenceProvider } from './catana/nanomodeling/sequence-providers/random-na-sequence-provider'
import { CatanaState } from './catana/actions/catana-state'
import Representation from './representation/representation'
import CgStructureComponent from './catana/component/cg-structure-component'
import LatticeComponent from './catana/component/lattice-component'
import { DirectionSelectorCircle } from './catana/visualizations/direction-selector'
import RepresentationElement from './component/representation-element'
import ResidueProxy from './proxy/residue-proxy'
import ChainProxy from './proxy/chain-proxy'
import AtomProxy from './proxy/atom-proxy'
import CgPolymer from './catana/data_model/cg-polymer'
import CgStructure from './catana/data_model/cg-structure'
import CgMonomerProxy from './catana/data_model/proxy/cg-monomer-proxy'
import FilterColormaker from './color/filter-colormaker'
import FastaWriter from './catana/writer/fasta-writer'
import CLICommandsParser from './catana/scripting/cli-commands-parser'
import { transformStructureToOxDnaGeometry } from './catana/nanomodeling/nucleic-acid-utils'
import { CgStructureElementType, StructureElementType } from './catana/data_model/types_declarations/element-type'
import RigidBodySimulator from './catana/dynamics/rigidbody-simulator'
import StructureCluster from './catana/dynamics/structure-cluster'
import RbJoint from './catana/dynamics/joints/rb-joint'
import ClusterAlgorithms from './catana/dynamics/clustering/cluster-algorithms'
import CgNucleicAcidCreateComplementaryState from './catana/actions/cg-nucleic-acid-create-complementary-state'
import { BDnaForm, BDnaIdealisticForm, DnaForm } from './catana/nanomodeling/dna-forms'
import { convertAllAtomStructureToCoarseGrained } from './catana/nanomodeling/aa-to-cg-structure-conversion'
import { AtomGenerationLimit } from './catana/nanomodeling/atom-generation'
import StructureAnalysis from './catana/visualizations/structure-analysis'
import LineChart from './catana/visualizations/d3_extensions/line-chart'
import BarChart from './catana/visualizations/d3_extensions/bar-chart'
import D3Chart from './catana/visualizations/d3_extensions/d3-chart'
import TrajectoryElement from './component/trajectory-element'
import PluginManager from './catana/scripting/plugin-manager'
import { PluginUIElemType, PluginUIElemTypeRecord, PluginUIModal } from './catana/scripting/plugin-ui'
import ScriptingApi from './catana/scripting/scripting-api'

if (!(window as any).Promise) {
  (window as any).Promise = _Promise
}

// Catana additions
export function getParserParameters(ext: string) {
  return ParserParametersRegistry.get(ext) || {};
}

export {
  Version,
  StaticDatasource,
  MdsrvDatasource,
  Colormaker,
  Filter,
  PdbWriter,
  SdfWriter,
  StlWriter,
  Stage,
  Collection,
  ComponentCollection,
  RepresentationCollection,
  Component,
  ShapeComponent,
  StructureComponent,
  SurfaceComponent,
  VolumeComponent,
  StructureRepresentationType,

  Assembly,
  TrajectoryPlayer,
  Superposition,
  Frames,

  Queue,
  Counter,

  BufferRepresentation,
  ArrowBuffer,
  BoxBuffer,
  ConeBuffer,
  CylinderBuffer,
  EllipsoidBuffer,
  MeshBuffer,
  OctahedronBuffer,
  PointBuffer,
  SphereBuffer,
  TetrahedronBuffer,
  TextBuffer,
  TorusBuffer,
  WidelineBuffer,

  Shape,

  Structure,
  Kdtree,
  SpatialHash,
  MolecularSurface,
  Volume,

  MouseActions,
  KeyActions,
  PickingProxy,

  // Catana addition
  Representation,
  CgStructureComponent,
  LatticeComponent,
  DirectionSelectorCircle,
  RepresentationElement,
  ResidueProxy,
  ChainProxy,
  AtomProxy,
  CgPolymer,
  StageLoadFileParams,
  CgMonomerProxy,
  CgStructure,
  FilterColormaker,
  chroma,
  // Catana stuff
  CatanaActions, CatanaProteinActions,
  getSuggestions, applySuggestion, getKeywords,
  addComponentFromSequence, getAminoAcidSequenceType, threeLetterToOneLetter, oneLetterToThreeLetter,
  PROTEIN_VALUES_THREE_LETTER, PROTEIN_VALUES_ONE_LETTER, DNA_VALUES,
  mergeStructureComponentsIntoOne,
  mergeComponentsContainingStructureIntoOne,
  appendAnyStructureComps,
  convertAllAtomStructureToCoarseGrained,
  duplicateComponentContainingStructure,
  convertCgStrucCompToAaStrucComp,
  convertAaStrucCompToCgStrucComp,
  mergeStructures,
  transformStructureToOxDnaGeometry,
  MultiObjectsStorage,
  UnfWriter,
  FastaWriter,
  LatticeType,
  CLICommandsParser,
  RigidBodySimulator,
  StructureCluster,
  RbJoint,
  ClusterAlgorithms,
  AtomGenerationLimit,
  StructureAnalysis,
  LineChart,
  BarChart,
  D3Chart,
  TrajectoryElement,
  PluginManager,
  PluginUIModal,
  PluginUIElemTypeRecord,
  PluginUIElemType,
  ScriptingApi,
  // Catana enums
  GizmoMode,
  StructureElementType,
  CgStructureElementType,
  // Catana states
  CatanaStateData,
  CgNucleicAcidCreateState, CreateLatticeState, CgRemoveState, CgNucleicAcidCreateComplementaryState,
  CgNucleicAcidConnectState, CgNucleicAcidExtendState, CgNucleicAcidChangeTypeState,
  ProteinRemoveState, ProteinAddAminoAcidsState, ProteinMutateAminoAcidState,
  MoveState, CenterState,
  // Sequence providers
  FastaSequenceProvider, RandomNaSequenceProvider,
  CatanaState,
  // DNA forms
  DnaForm, BDnaForm, BDnaIdealisticForm
}