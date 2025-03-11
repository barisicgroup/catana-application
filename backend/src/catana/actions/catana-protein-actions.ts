import Stage from "../../stage/stage";
import PickingProxy from "../../controls/picking-proxy";
import StructureComponent from "../../component/structure-component";
import AtomProxy from "../../proxy/atom-proxy";
import { appendResiduesToChain, duplicateStructure, mutateResidue } from "../../structure/structure-utils";
import { Log } from "../../globals";
import { Vector3 } from "three";
import Structure from "../../structure/structure";
import { AminoAcidStructuresMap, AminoAcidStructuresProvider } from "../nanomodeling/structure-providers/amino-acid-structures-provider";
import { threeLetterCodeToAminoAcidType } from "../data_model/types_declarations/monomer-types";
//import safeStringify from 'fast-safe-stringify';

/**
 * Class offering various functionality to modify all-atom structures
 */
export class CatanaProteinActions {

    /**
     * Removes an atom from the given structure
     * 
     * @param stage reference to stage instance
     * @param pickingProxy desired atom's picking proxy 
     */
    public removeAtom(stage: Stage, pickingProxy: PickingProxy) {
        //console.log("before: ", safeStringify((pickingProxy.component as StructureComponent).structure, undefined, 2));
        this.removeCommon(pickingProxy, (comp, atom) => comp.structure.removeAtom(atom));
        //console.log("after: ", safeStringify((pickingProxy.component as StructureComponent).structure, undefined, 2));
    }

    /**
    * Removes a residue from the given structure
    * 
    * @param stage reference to stage instance
    * @param pickingProxy atom picking proxy where the atom is one of the atoms of residue to remove
    */
    public removeResidue(stage: Stage, pickingProxy: PickingProxy) {
        this.removeCommon(pickingProxy, (comp, atom) => comp.structure.removeResidue(atom.residue));
    }

    /**
    * Removes a chain from the given structure
    * 
    * @param stage reference to stage instance
    * @param pickingProxy atom picking proxy where the atom is one of the atoms of chain to remove
    */
    public removeChain(stage: Stage, pickingProxy: PickingProxy) {
        this.removeCommon(pickingProxy, (comp, atom) => comp.structure.removeChain(comp.structure.getChainProxy(atom.chainIndex)));
    }

    /**
     * Appends amino acid(s) to the given structure
     * 
     * @param stage reference to stage instance
     * @param pickingProxy atom picking proxy identifying the chain to be modified 
     * @param direction direction in which the amino acids should be appended
     * @param aaType three-letter code determining what residue to add
     * @param chainEnd 'C' or 'N' determining to which chain end the residue should be appended
     * @param count how many (copies of) residues to append
     * @returns promise which finishes after the operation is done
     */
    public addAminoAcids(stage: Stage, pickingProxy: PickingProxy, direction: Vector3, aaType: string, chainEnd: 'C' | 'N', count: number): Promise<void> {
        return this.addAminoAcidsExpandedArgs(stage, pickingProxy, direction, aaType, chainEnd, count);
    }

    /**
     * Mutates given amino acid, i.e., changes it to a different one.
     * 
     * @param stage reference to stage instance
     * @param pickingProxy atom picking proxy identifying the residue to mutate 
     * @param aaType three-letter code determining the new residue type
     * @returns promise which finishes after the operation is done
     */
    public mutateAminoAcid(stage: Stage, pickingProxy: PickingProxy, aaType: string): Promise<void> {
        return this.mutateAminoAcidExpandedArgs(stage, pickingProxy, aaType);
    }

    private removeCommon(pickingProxy: PickingProxy, callback: (comp: StructureComponent, atom: AtomProxy) => void) {
        if (!pickingProxy || !(pickingProxy.component instanceof StructureComponent)) return;

        const component: StructureComponent = pickingProxy.component;
        // TODO This can be distinguished based on representation (atom/residue/..)
        if (pickingProxy.atom) {
            callback(component, pickingProxy.atom);
            component.rebuildRepresentations();
        }
    }

    /**
     * Loads an all-atom structure of the given residue and duplicates it.
     */
    private loadResidueCommon(stage: Stage, pickingProxy: PickingProxy, aaType: string): Promise<Structure> {
        return new Promise<Structure>((res, rej) => {
            AminoAcidStructuresProvider.loadAminoAcids().then(
                (smap: AminoAcidStructuresMap) => {
                    const structure = smap.get(threeLetterCodeToAminoAcidType(aaType));

                    if (structure !== undefined) {
                        res(duplicateStructure(structure));
                    } else {
                        rej("AA structure does not exist: " + aaType);
                    }
                },
                (e: Error | string) => {
                    Log.error(e);
                    rej(e);
                });
        });
    }

    private addAminoAcidsExpandedArgs(stage: Stage, pickingProxy: PickingProxy, direction: Vector3, aaType: string = "cys", chainEnd: 'C' | 'N' = 'N', count: number = 3): Promise<void> {
        return new Promise<void>((res, rej) => {
            if (!pickingProxy || !(pickingProxy.component instanceof StructureComponent) || !pickingProxy.atom) {
                res(); // TODO or 'rej()'?
            } else {
                this.loadResidueCommon(stage, pickingProxy, aaType).then((structure) => {
                    appendResiduesToChain(pickingProxy.atom.structure, pickingProxy.atom.chainIndex,
                        structure, chainEnd, count, aaType.toUpperCase(), undefined, direction);
                    res();
                });
            }
        });
    }

    private mutateAminoAcidExpandedArgs(stage: Stage, pickingProxy: PickingProxy, aaType: string = "cys"): Promise<void> {
        return new Promise<void>((res, rej) => {
            if (!pickingProxy || !(pickingProxy.component instanceof StructureComponent) || !pickingProxy.atom) {
                res(); // TODO or 'rej()'?
            } else {
                this.loadResidueCommon(stage, pickingProxy, aaType).then((structure) => {
                    mutateResidue(pickingProxy.atom.structure, pickingProxy.atom.residueIndex,
                        structure, aaType.toUpperCase());
                    res();
                });
            }
        });
    }
}

export default CatanaProteinActions;