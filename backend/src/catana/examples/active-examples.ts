import { ExampleRegistry } from "../../globals";
import ExampleCadnanoLoad from "./example-cadnano-load";
import ExampleCgToAtom from "./example-cg-to-atom";
import ExampleCreateDs from "./example-create-ds";
import ExampleMixedVis from "./example-mixed-vis";
import ExamplePdbLoad from "./example-pdb-load";
import ExampleAtomToCg from "./example-atom-to-cg";
import ExampleStructureAssembly from "./example-structure-assembly";
import ExampleAtomModifications from "./example-atom-modifications";
import ExampleCgModifications from "./example-cg-modifications";
import ExampleAlphaFold from "./example-alphafold";
import ExampleSuperpose from "./example-superpose";

// Defines examples stored in the registry, exported in the module 
// and thus available in the frontend code and related places.

ExampleRegistry.add("pdb-load", ExamplePdbLoad);
ExampleRegistry.add("cadnano-load", ExampleCadnanoLoad);
ExampleRegistry.add("mixed-vis", ExampleMixedVis);
ExampleRegistry.add("cg-to-atom", ExampleCgToAtom);
ExampleRegistry.add("atom-to-cg", ExampleAtomToCg);
ExampleRegistry.add("create-ds", ExampleCreateDs);
ExampleRegistry.add("struc-assembly", ExampleStructureAssembly);
ExampleRegistry.add("atom-modif", ExampleAtomModifications);
ExampleRegistry.add("cg-modif", ExampleCgModifications);
ExampleRegistry.add("alphafold", ExampleAlphaFold);
ExampleRegistry.add("superpose", ExampleSuperpose);