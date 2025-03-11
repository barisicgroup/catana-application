import { Vector3 } from "three";
import Component from "../../../component/component";
import CgPolymer from "../cg-polymer";

/**
 * Monomer bond proxy class provides an abstracted view onto a bond between two monomers
 */
export abstract class CgMonomerBondProxy {
    protected _bondStartPolymer: CgPolymer;
    protected _bondStartIndex: number;

    protected _bondEndPolymer: CgPolymer | undefined;
    protected _bondEndIndex: number | undefined;

    protected _alternativeEndPosition: Vector3 | undefined;

     /**
     * @param parentPolymer Parent polymer of the starting monomer (or both monomers)
     * @param bondStartIndex Index of starting monomer w.r.t parent polymer
     * @param bondEndIndex Index of ending monomer w.r.t its parent polymer
     * @param bondEndPolymer Parent polymer of ending monomer (if not set, parentPolymer is considered as parent)
     */
    constructor(parentPolymer: CgPolymer, bondStartIndex: number, bondEndIndex?: number, bondEndPolymer?: CgPolymer) {
        this._bondStartPolymer = parentPolymer;
        this._bondStartIndex = bondStartIndex;

        this._bondEndPolymer = bondEndPolymer ?? parentPolymer;
        this._bondEndIndex = bondEndIndex ?? ((bondStartIndex + 1) % this._bondEndPolymer.length);

        this._alternativeEndPosition = undefined;
    }

    /**
     * @returns Index of starting monomer
     */
    public get bondStartIndex(): number {
        return this._bondStartIndex;
    }

    /**
     * @returns Index of ending monomer if set, otherwise undefined
     */
    public get bondEndIndex(): number | undefined {
        return this._bondEndIndex;
    }

    /**
     * @returns Parent polymer of the starting monomer (or both monomers if bondEndPolymer not set)
     */
    public get bondStartPolymer(): CgPolymer {
        return this._bondStartPolymer;
    }

    /**
     * @returns Parent polymer of ending monomer if set, otherwise undefined.
     */
    public get bondEndPolymer(): CgPolymer | undefined {
        return this._bondEndPolymer;
    }

    /**
     * @returns Alternative end position (used instead of ending monomer's position)
     */
    public get alternativeEndPosition(): Vector3 | undefined {
        return this._alternativeEndPosition;
    }

    /**
     * Sets alternative end position to be used instead of the position
     * derived from ending monomer
     * 
     * @param pos positon of the bond end
     */
    public setAlternativeEndPosition(pos: Vector3) {
        this._alternativeEndPosition = pos;

        this._bondEndIndex = undefined;
        this._bondEndPolymer = undefined;
    }

    /**
     * Sets the monomer at the "end" of the bond
     * 
     * @param bondEndPolymer parent polymer of the monomer
     * @param bondEndIndex index of the monomer w.r.t its monomer
     */
    public setBondEndElement(bondEndPolymer: CgPolymer, bondEndIndex: number) {
        this._bondEndPolymer = bondEndPolymer;
        this._bondEndIndex = bondEndIndex;

        this._alternativeEndPosition = undefined;
    }

    /**
     * Resets the data (alternative position and end monomer) related to the end of this bond
     */
    public resetBondEndData() {
        this._bondEndIndex = undefined;
        this._bondEndPolymer = undefined;
        this._alternativeEndPosition = undefined;
    }

    /**
     * @returns Positions in the local system of the bond endpoints,
     * i.e., ignoring the respective component transformations
     */
    public abstract get positions(): [Vector3, Vector3];

    /**
     * @returns World positions of the bond endpoints, 
     * i.e., transformed by the corresponding components transformations
     */
    public get positionsWorld(): [Vector3, Vector3] {
        let c1: Component | null | undefined = null;
        let c2: Component | null | undefined = null;

        if (this.bondStartPolymer.parentStructure) {
            c1 = this.bondStartPolymer.parentStructure.parentComponent;
        }

        if (this.bondEndPolymer) {
            c2 = this.bondEndPolymer?.parentStructure?.parentComponent;
        }

        const pos = this.positions;
        return [
            c1 ? c1.localToWorldPosition(pos[0]) : pos[0],
            c2 ? c2.localToWorldPosition(pos[1]) : pos[1],
        ]
    }

    /**
     * @returns Midpoint position of this bond
     */
    public get position() {
        const positions = this.positions;
        return positions[0].clone().add(positions[1]).divideScalar(2);
    }
}

export default CgMonomerBondProxy;