import { Vector3 } from "three";
import Store, { StoreField } from "../../../store/store";

export default abstract class CgMonomerStore extends Store {
    globalId: Int32Array;
    /**
     * Identification/index of relevant all-atom residue; -1 if no reference exists
     */
    pdbId: Int32Array;

    get _defaultFields() {
        return [
            ['globalId', 1, 'int32'],
            ['pdbId', 1, 'int32']
        ] as StoreField[]
    }

    /**
     * Stores [X, Y, Z] values stored in the source array
     * to the corresponding index in the store's destination array
     * 
     * @param dataArr destionation array
     * @param i index where the data should be stored
     * @param sourceArr source array
     */
    protected vectorDataFromArray(dataArr: Float32Array, i: number, sourceArr: number[]): void {
        const j = 3 * i;
        dataArr[j] = sourceArr[0];
        dataArr[j + 1] = sourceArr[1];
        dataArr[j + 2] = sourceArr[2];
    }

    /**
     * Stores [X, Y, Z] values stored in the source vector
     * to the corresponding index in the store's destination array
     * 
     * @param dataArr destionation array
     * @param i index where the data should be stored
     * @param source source vector
    */
    protected vectorDataFromVector3(dataArr: Float32Array, i: number, source: Vector3): void {
        const j = 3 * i;
        dataArr[j] = source.x;
        dataArr[j + 1] = source.y;
        dataArr[j + 2] = source.z;
    }

    /**
     * Copies [X, Y, Z] values stored at the given index in the source store's array
     * to the destination array (if provided)
     * 
     * @param dataArr source array
     * @param i index from which the data should be copied
     * @param destArr destination array (if not provided, new array of size 3 will be initialized)
     * @returns reference to destArray if provided, otherwise reference to newly created array
    */
    protected vectorDataToArray(dataArr: Float32Array, i: number, destArr?: number[]): number[] {
        const finArr = destArr !== undefined && destArr.length >= 3 ?
            destArr : [0, 0, 0];

        const j = 3 * i;
        finArr[0] = dataArr[j];
        finArr[1] = dataArr[j + 1];
        finArr[2] = dataArr[j + 2];

        return finArr;
    }

    /**
    * Copies [X, Y, Z] values stored at the given index in the source store's array
    * to the destination vector (if provided)
    * 
    * @param dataArr source array
    * @param i index from which the data should be copied
    * @param vector destionation vector (if not provided, new vector will be instantiated)
    * @returns reference to vector param if provided, otherwise reference to a newly created vector instance
    */
    protected vectorDataToVector3(dataArr: Float32Array, i: number, vector?: Vector3): Vector3 {
        const finVct = vector ?? new Vector3();

        const j = 3 * i;
        finVct.x = dataArr[j];
        finVct.y = dataArr[j + 1];
        finVct.z = dataArr[j + 2];

        return finVct;
    }
}