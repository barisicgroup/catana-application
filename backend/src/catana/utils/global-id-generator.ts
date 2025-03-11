/**
 * Class used for the generation of unique IDs for the coarse-grained data model
 * and related features.
 */
export class GlobalIdGenerator {
    private static _currState: number = 0;

    /**
     * Sets the value of the internal counter to the provided one
     * @param newStart new value of the counter
     */
    public static setStartingId(newStart: number) {
        this._currState = newStart;
    }

    /**
     * @returns current internal value of the counter
     */
    public static get currentState(): number {
        return this._currState;
    }

    /**
     * @returns newly generated ID
     */
    public static generateId(): number {
        return this._currState++;
    }

    /**
     * Generates an array of IDs
     * 
     * @param count how many IDs to generate
     * @returns array with generated IDs
     */
    public static generateIds(count: number): number[] {
        const res: number[] = [];

        for (let i = 0; i < count; ++i) {
            res.push(this.generateId());
        }

        return res;
    }

}

export default GlobalIdGenerator;