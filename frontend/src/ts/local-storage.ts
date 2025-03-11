class LocalStorage<T> {

    private static readonly storages: string[] = [];

    private readonly name: string;

    public constructor(name: string) {
        this.name = name;
        if (LocalStorage.storages.includes(name)) {
            console.warn("LocalStorage object with name \"" + name + "\" was created more than once");
        } else {
            LocalStorage.storages.push(name);
        }
    }

    public get(def: T): T {
        const obj = window.localStorage.getItem(this.name);
        if (obj === null) return def;
        return JSON.parse(obj);
    }

    public set(value: T) {
        window.localStorage.setItem(this.name, JSON.stringify(value));
    }
}

export default LocalStorage;