import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { ClientString } from "../../../data/poe/types.js";

export class StringProvider {
    private readonly idx = new Map<string, ClientString>();

    constructor() {
        for (const str of POE_DATA.strings) {
            this.idx.set(str.id, str);
        }
    }

    provide(id: string): ClientString | undefined {
        return this.idx.get(id);
    }

    mustProvide(id: string): ClientString {
        const str = this.provide(id);
        if (!str) {
            throw new Error(`id not found: ${id}`);
        }
        return str;
    }
}
