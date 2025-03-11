/**
 * The purpose of this class is to allow iteration over elements of several independent arrays,
 * where the elements are of the same or similar (e.g., equal base class) type.
 * While the iteration is consecutive, the arrays are not merged in fact,
 * avoiding possibly expensive memory allocations.
 */
export class MultiArrayIterator<ArrayElementType> implements Iterable<ArrayElementType> {
    private _arrays: ArrayElementType[][];

    public constructor(...arrays: ArrayElementType[][]) {
        this._arrays = arrays;
    }

    public get length(): number {
        return this._arrays.reduce((prevSum, currArr) => {
            return prevSum + currArr.length;
        }, 0);
    }

    public get(index: number): ArrayElementType | undefined {
        let currArrIdx = 0;

        while (currArrIdx < this._arrays.length) {
            const currArr = this._arrays[currArrIdx];
            if (index >= currArr.length) {
                index -= currArr.length;
                ++currArrIdx;
            } else {
                return currArr[index];
            }
        }

        return undefined;
    }

    public forEach(callback: (a: ArrayElementType) => void): void {
        for (let pol of this) {
            callback(pol);
        }
    }

    [Symbol.iterator]() {
        let counter = 0;
        let length = this.length;
        return {
            next: () => {
                return {
                    done: counter >= length,
                    value: this.get(counter++)!
                }
            }
        }
    }

    public some(callback: (a: ArrayElementType) => boolean): boolean {
        for (let pol of this) {
            if (callback(pol)) {
                return true;
            }
        }

        return false;
    }

    public find(callback: (a: ArrayElementType) => boolean): ArrayElementType | undefined {
        for (let pol of this) {
            if (callback(pol)) {
                return pol;
            }
        }

        return undefined;
    }
}

export default MultiArrayIterator;