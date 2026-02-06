import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { Property } from "../../../data/poe/types.js";
import { getTextSkeleton } from "../util/text.js";

const VARIABLE_PLACEHOLDER = "{0}";

export class PropertyProvider {
    private readonly zhIdx = new Map<string, Property>();
    private readonly zhSkeletonIdx = new Map<string, Property[]>();

    constructor() {
        for (const p of POE_DATA.properties) {
            const zh = p.zh;
            this.zhIdx.set(zh, p);

            if (zh.includes(VARIABLE_PLACEHOLDER)) {
                const zhSkeleton = getTextSkeleton(zh);
                const value = this.zhSkeletonIdx.get(zhSkeleton);
                if (value) {
                    value.push(p);
                } else {
                    this.zhSkeletonIdx.set(getTextSkeleton(zh), [p]);
                }
            }
        }
    }

    provideByZh(zh: string): Property | undefined {
        return this.zhIdx.get(zh);
    }

    provideVariablePropertiesByZhSkeleton(
        skeleton: string,
    ): Property[] | undefined {
        return this.zhSkeletonIdx.get(skeleton);
    }
}
