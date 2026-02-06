import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type {
    Requirement,
    RequirementSuffix,
} from "../../../data/poe/types.js";

export class RequirementProvider {
    private readonly zhIdx = new Map<string, Requirement>();
    private readonly suffixesZhIdx = new Map<string, RequirementSuffix>();

    constructor() {
        for (const r of POE_DATA.requirements) {
            const zh = r.zh;
            this.zhIdx.set(zh, r);
        }

        for (const s of POE_DATA.requirementSuffixes) {
            const zh = s.zh;
            this.suffixesZhIdx.set(zh, s);
        }
    }

    provideByZh(zh: string): Requirement | undefined {
        return this.zhIdx.get(zh);
    }

    provideSuffixByZh(zh: string): RequirementSuffix | undefined {
        return this.suffixesZhIdx.get(zh);
    }
}
