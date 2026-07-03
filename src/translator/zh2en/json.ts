import * as itemTypes from "../../api/item.js";
import * as passiveSkillTypes from "../../api/passive_skill.js";
import { BasicTranslator } from "./basic.js";

const ZH_THIEF_TRINKET = "赏金猎人饰品";
export const ZH_FORBIDDEN_FLESH = "禁断之肉";
export const ZH_FORBIDDEN_FLAME = "禁断之火";

export const ZH_CLASS_SCION = "贵族";

export const ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN = "暗影";
export const ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN_FIXED = "暗影（贵族）";

const ZH_REQUIREMENT_NAME_CLASS = "职业：";

export class JsonTranslator {
    constructor(private readonly basic: BasicTranslator) {}

    /**
     * 翻译前预处理 Item
     *
     * 国服在本地化时，引入了一些错误，部分错误只能通过 hack 的方式进行解决
     */
    private preHandleItem(item: itemTypes.Item) {
        if (
            item.name === ZH_FORBIDDEN_FLAME ||
            item.name === ZH_FORBIDDEN_FLESH
        ) {
            if (item.requirements) {
                for (const requirement of item.requirements) {
                    const name = requirement.name;

                    if (name !== ZH_REQUIREMENT_NAME_CLASS) {
                        continue;
                    }

                    const value = requirement.values[0][0];
                    // 禁断珠宝，其中贵族的升华大点 `暗影` 与暗影的升华大点 `暗影` 存在中文同名问题
                    if (value === ZH_CLASS_SCION) {
                        if (item.explicitMods) {
                            for (let i = 0; i < item.explicitMods.length; i++) {
                                const zhStat = item.explicitMods[i] as string;
                                if (
                                    zhStat.endsWith(
                                        ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN,
                                    )
                                ) {
                                    item.explicitMods[i] = zhStat.replace(
                                        ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN,
                                        ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN_FIXED,
                                    );
                                }
                            }
                        }
                    }

                    break;
                }
            }
        }

        // S26 赛季武器附魔引入的中文词缀重复问题
        if (item.enchantMods) {
            for (let i = 0; i < item.enchantMods.length; i++) {
                const mod: string = item.enchantMods[i];
                if (/^元素伤害(提高|降低) \d+%$/.test(mod)) {
                    item.enchantMods[i] = "该武器的" + mod;
                }
            }
        }
    }

    /**
     * 翻译 items json 数据
     *
     * 本函数采用本地翻译，会修改原始对象
     */
    transItems(items: itemTypes.GetItemsResult) {
        const itemList = items.items;
        const result: itemTypes.Item[] = [];
        for (const item of itemList) {
            if (this.isPobItem(item)) {
                this.transItem(item);
                result.push(item);
            }
        }
        items.items = result;
    }

    private isPobItem(item: itemTypes.Item): boolean {
        return !(
            item.inventoryId === "MainInventory" ||
            item.inventoryId === "ExpandedMainInventory" ||
            item.baseType === ZH_THIEF_TRINKET
        );
    }

    /**
     * 翻译 Item
     *
     * 本函数采用本地翻译，会修改原始对象
     */
    transItem(item: itemTypes.Item) {
        this.preHandleItem(item);

        const name = item.name;
        const baseType = item.baseType;

        // 传奇物品、稀有物品的name不为""
        // 魔法物品、普通物品的name为""
        const result = this.basic.transNameAndBaseType(name, baseType);
        if (result) {
            item.name = result.name;
            item.baseType = result.baseType;
        } else {
            console.warn(`untranslated: item name, ${name}`);
            console.warn(`untranslated: item baseType, ${baseType}`);
        }

        // 使用翻译后的baseType作为typeLine的翻译结果，性能最快
        // 但可能不满足某些需求
        item.typeLine = item.baseType;

        if (item.requirements) {
            for (const req of item.requirements) {
                const name = req.name;
                const result = this.basic.transRequirementName(req.name);
                if (result) {
                    req.name = result;
                } else {
                    console.warn(`untranslated: requirement name, ${name}`);
                }

                if (req.values) {
                    for (const v of req.values) {
                        const value = v[0];
                        const result = this.basic.transRequirement(name, value);
                        if (result && result.value) {
                            v[0] = result.value;
                        }
                    }
                }

                if (req.suffix) {
                    const suffix = req.suffix;
                    const res = this.basic.transRequirementSuffix(suffix);
                    if (res) {
                        req.suffix = res;
                    } else {
                        console.warn(
                            `untranslated: requirement suffix, ${suffix}`,
                        );
                    }
                }
            }
        }

        if (item.properties) {
            for (const prop of item.properties) {
                const name = prop.name;
                const value = this.basic.transPropertyName(name);
                if (value) {
                    prop.name = value;
                } else {
                    console.warn(`untranslated: property name, ${name}`);
                }

                if (prop.values) {
                    for (const v of prop.values) {
                        const value = v[0];
                        const result = this.basic.transProperty(name, value);
                        if (result && result.value) {
                            v[0] = result.value;
                        }
                    }
                }
            }
        }

        if (item.socketedItems) {
            for (const si of item.socketedItems) {
                if ((si as itemTypes.AbyssalJewel).abyssJewel) {
                    this.transItem(si);
                } else {
                    this.transGem(si as itemTypes.Gem);
                }
            }
        }

        if (item.enchantMods) {
            for (let i = 0; i < item.enchantMods.length; i++) {
                const mod = item.enchantMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.enchantMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.explicitMods) {
            for (let i = 0; i < item.explicitMods.length; i++) {
                const mod = item.explicitMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.explicitMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.implicitMods) {
            for (let i = 0; i < item.implicitMods.length; i++) {
                const mod = item.implicitMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.implicitMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.craftedMods) {
            for (let i = 0; i < item.craftedMods.length; i++) {
                const mod = item.craftedMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.craftedMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.utilityMods) {
            for (let i = 0; i < item.utilityMods.length; i++) {
                const mod = item.utilityMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.utilityMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.fracturedMods) {
            for (let i = 0; i < item.fracturedMods.length; i++) {
                const mod = item.fracturedMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.fracturedMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.scourgeMods) {
            for (let i = 0; i < item.scourgeMods.length; i++) {
                const mod = item.scourgeMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.scourgeMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.crucibleMods) {
            for (let i = 0; i < item.crucibleMods.length; i++) {
                const mod = item.crucibleMods[i];
                const result = this.basic.transMod(mod);

                if (result) {
                    item.crucibleMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }

        if (item.mutatedMods) {
            for (let i = 0; i < item.mutatedMods.length; i++) {
                const mod = item.mutatedMods[i];
                const result = this.basic.transMod(mod);
                if (result) {
                    item.mutatedMods[i] = result;
                } else {
                    console.warn(`untranslated: mod: ${mod}`);
                }
            }
        }
    }

    private transGem(gem: itemTypes.Gem) {
        const baseType = gem.baseType;
        const typeLine = gem.typeLine;
        if (baseType) {
            const result = this.basic.transSkill(baseType);
            if (result) {
                gem.baseType = result;
            } else {
                console.warn(`untranslated: gem baseType: ${baseType}`);
            }
        }

        if (typeLine) {
            const result = this.basic.transSkill(typeLine);
            if (result) {
                gem.typeLine = result;
            } else {
                console.warn(`untranslated: gem typeLine: ${typeLine}`);
            }
        }

        if (gem.hybrid) {
            const result = this.basic.transSkill(gem.hybrid.baseTypeName);
            if (result) {
                gem.hybrid.baseTypeName = result;
            } else {
                console.warn(
                    `untranslated: gem hybrid baseTypeName: ${gem.hybrid.baseTypeName}`,
                );
            }
        }

        if (gem.properties) {
            for (const prop of gem.properties) {
                const result = this.basic.transSkillProp(prop.name);
                if (result) {
                    prop.name = result;
                }
            }
        }

        if (gem.builtInSupport) {
            const result = this.basic.transBuiltInSupport(gem.builtInSupport);
            if (result) {
                gem.builtInSupport = result;
            } else {
                console.warn(
                    `untranslated: gem builtInSupport: ${gem.builtInSupport}`,
                );
            }
        }
    }

    transPassiveSkills(skills: passiveSkillTypes.GetPassiveSkillsResult) {
        for (const item of skills.items) {
            this.transItem(item);
        }

        for (const value of Object.values<passiveSkillTypes.SkillOverride>(
            skills.skill_overrides,
        )) {
            if (value.name) {
                const name = value.name;
                if (value.isKeystone) {
                    const result = this.basic.transKeystone(name);
                    if (result) {
                        value.name = result;
                    } else {
                        console.warn(`untranslated: keystone, ${name}`);
                    }
                } else if (value.isNotable) {
                    const result = this.basic.transAscendant(name);
                    if (result) {
                        value.name = result;
                    } else {
                        console.warn(
                            `untranslated: ascendant notable, ${name}`,
                        );
                    }
                } else {
                    const result = this.basic.transBaseType(name);
                    if (result) {
                        value.name = result;
                    } else {
                        console.warn(`untranslated: baseType, ${name}`);
                    }
                }
            }
        }
    }
}
