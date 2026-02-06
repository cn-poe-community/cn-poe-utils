import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { Node } from "../../../data/poe/types.js";

export class PassiveSkillProvider {
    private readonly anointedZhIdx = new Map<string, Node>();
    private readonly keystonesZhIdx = new Map<string, Node>();
    private readonly ascendantZhIdx = new Map<string, Node>();

    constructor() {
        const anointedZhCount = new Map<string, number>();
        for (const node of POE_DATA.anointed) {
            this.anointedZhIdx.set(node.zh, node);
            anointedZhCount.set(
                node.zh,
                (anointedZhCount.get(node.zh) ?? 0) + 1,
            );
        }

        // 移除重复的中文对应的索引，避免返回错误的涂油词缀翻译
        for (const [zh, count] of anointedZhCount) {
            if (count > 1) {
                this.anointedZhIdx.delete(zh);
            }
        }

        for (const node of POE_DATA.keystones) {
            this.keystonesZhIdx.set(node.zh, node);
        }

        for (const node of POE_DATA.ascendant) {
            this.ascendantZhIdx.set(node.zh, node);
        }
    }

    provideAnointedByZh(zh: string): Node | undefined {
        return this.anointedZhIdx.get(zh);
    }

    provideKeystoneByZh(zh: string): Node | undefined {
        return this.keystonesZhIdx.get(zh);
    }

    provideAscendantByZh(zh: string): Node | undefined {
        return this.ascendantZhIdx.get(zh);
    }
}
