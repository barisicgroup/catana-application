/**
 * https://search.rcsb.org
 */

import {Server} from "./networking";

export interface RcsbResultEntry {
    readonly pdbId: string;
    readonly score: number;
    //readonly details?: RcsbResultEntryDetails;
}

export interface RcsbResultEntryDetails {

}

export interface RcsbResult {
    readonly query: string;
    readonly entries: RcsbResultEntry[];
    readonly totalCount: number;
    readonly start: number;
    //readonly end: number;
}

function buildSimpleFullText(query: string, start: number, length: number): string {
    return JSON.stringify({
        query: {
            type: "terminal",
            service: "full_text",
            parameters: {
                value: query
            }
        },
        request_options: {
            paginate: {
                start: start,
                rows: length
            }
        },
        return_type: "entry"
    });
}

class RcsbServer extends Server {
    public constructor() {
        super("https://search.rcsb.org/rcsbsearch/v2/query");
    }

    protected _search(query: string, start: number, length: number): Promise<RcsbResult> {
        return RcsbServer.fetch(this.url(), "POST", buildSimpleFullText(query, start, length), "json")
            .then(r => r.json())
            .then(json => {
                const totalCount = json.total_count;
                const results: RcsbResultEntry[] = [];

                const resultSet = json.result_set;
                for (const r of resultSet) {
                    const pdbId = r.identifier;
                    const score = r.score;
                    results.push({ pdbId, score });
                }

                return {
                    query: query,
                    entries: results,
                    start: start,
                    totalCount: totalCount
                };
            });
    }

    public search(query: string, howMany: number): Promise<RcsbResult> {
        return this._search(query, 0, howMany);
    }

    public loadMore(result: RcsbResult, howMany: number): Promise<RcsbResult> {
        const start = result.start + result.query.length;
        if (start >= result.totalCount) {
            return Promise.resolve({
                query: result.query,
                totalCount: result.totalCount,
                start: result.totalCount,
                entries: []
            });
        }

        const end = Math.min(start + howMany, result.totalCount);
        const length = end - start;

        return this._search(result.query, start, length);
    }

    public loadDetails(entry: RcsbResultEntry): Promise<void> {
        // TODO
        return Promise.resolve();
    }

    public loadImage(entry: RcsbResultEntry): Promise<void> {
        // TODO
        return Promise.resolve();
    }
}

export default RcsbServer;