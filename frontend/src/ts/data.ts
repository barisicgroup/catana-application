class Data<T> {
    private readonly data: { [id: string]: T };

    public constructor(data?: { [id: string]: T }) {
        this.data = data ? data : {};
    }

    public get(id: string, def: T): T {
        if (this.data[id] === undefined) return def;
        return this.data[id];
    }

    public set(id: string, value: T) {
        this.data[id] = value;
    }

    public remove(id: string) {
        delete this.data[id];
    }

    public has(id: string) {
        return this.data[id] !== undefined;
    }
}

export default Data;