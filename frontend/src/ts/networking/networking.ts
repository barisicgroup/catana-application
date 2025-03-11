type Data = { [name: string]: string };

export class Server {
    private readonly _url: string;
    public constructor(url: string) {
        this._url = url;
    }

    protected url(command?: string) {
        return this._url + (command ? ("/" + command) : "");
    }

    public async fetchText(command?: string, data?: Data): Promise<null | string> {
        return Server.fetch(this.url(command), "GET", data)
            .then((r) => r?.text() || null);
    }

    public async fetchJson(command?: string, data?: Data): Promise<null | { [id: string]: any }> {
        return Server.fetch(this.url(command), "GET", data)
            .then((r) => r?.json() || null);
    }

    // Static ----------------------------------------------------------------------------------------------------------

    protected static async fetch(url: string, method: "GET" | "POST", data?: string | Data, type: "plain" | "json" = "plain"): Promise<null | Response> {
        return fetch(url, {
            method: method,
            body: data ? JSON.stringify(data) : "",
            headers: {
                "Content-Type": type === "plain" ? "text/plain" : "application/json"
            }
        }).then((r) => {
            if (!r.ok) {
                console.error("Server response was not ok");
                return null;
            }
            if (r.body === null) {
                console.error("Server response had null body");
                return null;
            }
            return r;
        });
    }
}

export class CatanaServer extends Server {
    public constructor(api?: number) {
        super("THIS_WAS_REMOVED");  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
    }
}

export default CatanaServer;