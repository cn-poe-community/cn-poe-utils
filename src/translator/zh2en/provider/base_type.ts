import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { BaseType } from "../../../data/poe/types.js";

export class BaseTypeProvider {
    private readonly zhIdx = new Map<string, BaseType[]>();

    constructor() {
        const baseTypesList = [
            POE_DATA.amulets,
            POE_DATA.belts,
            POE_DATA.bodyArmours,
            POE_DATA.boots,
            POE_DATA.flasks,
            POE_DATA.gloves,
            POE_DATA.helmets,
            POE_DATA.jewels,
            POE_DATA.quivers,
            POE_DATA.rings,
            POE_DATA.shields,
            POE_DATA.tattoos,
            POE_DATA.tinctures,
            POE_DATA.weapons,
        ];
        for (const baseTypeList of baseTypesList) {
            for (const baseType of baseTypeList) {
                const zh = baseType.zh;

                if (this.zhIdx.has(zh)) {
                    this.zhIdx.get(zh)?.push(baseType);
                } else {
                    this.zhIdx.set(zh, [baseType]);
                }
            }
        }
    }

    provideByZh(zh: string): BaseType[] | undefined {
        return this.zhIdx.get(zh);
    }
}
