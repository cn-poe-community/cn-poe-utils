import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { Skill } from "../../../data/poe/types.js";

export class SkillProvider {
    private readonly zhIdx = new Map<string, Skill>();
    private readonly indexableSupportZhIdx = new Map<string, Skill>();

    constructor() {
        for (const skill of POE_DATA.gemSkills) {
            this.zhIdx.set(skill.zh, skill);
        }
        for (const skill of POE_DATA.hybridSkills) {
            this.zhIdx.set(skill.zh, skill);
        }
        for (const skill of POE_DATA.transfiguredSkills) {
            this.zhIdx.set(skill.zh, skill);
        }

        for (const skill of POE_DATA.indexableSupports) {
            this.indexableSupportZhIdx.set(skill.zh, skill);
        }
    }

    provideSkill(zh: string): Skill | undefined {
        return this.zhIdx.get(zh);
    }

    provideIndexableSupport(zh: string): Skill | undefined {
        return this.indexableSupportZhIdx.get(zh);
    }
}
