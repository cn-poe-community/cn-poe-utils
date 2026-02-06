import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { Attribute } from "../../../data/poe/types.js";

export class AttributeProvider {
    private zhIdx = new Map<string, Attribute>();

    constructor() {
        for (const p of POE_DATA.attributes) {
            const zh = p.zh;
            this.zhIdx.set(zh, p);
        }
    }

    provideByZh(zh: string): Attribute | undefined {
        return this.zhIdx.get(zh);
    }
}
