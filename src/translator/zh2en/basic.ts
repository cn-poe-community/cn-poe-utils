import { AttributeProvider } from "./provider/attribute.js";
import { BaseTypeProvider } from "./provider/base_type.js";
import { SkillProvider } from "./provider/skill.js";
import { PassiveSkillProvider } from "./provider/passive_skill.js";
import { PropertyProvider } from "./provider/property.js";
import { RequirementProvider } from "./provider/requirement.js";
import { StatProvider } from "./provider/stat.js";
import type { StringProvider } from "./provider/sting.js";
import type {
    BaseType,
    ClientString,
    Stat,
    Unique,
} from "../../data/poe/types.js";
import { Template } from "./util/template.js";
import { getTextSkeleton, LINE_SEPARATOR } from "./util/text.js";

const DEFAULT_RARITY_ITEM_NAME = "Item";

const GEM_PROPERTY_MAP = new Map([
    ["等级", "Level"],
    ["品质", "Quality"],
]);

/**
 * BasicTranslator 提供了最基础、最底层的中文翻译为英文的功能，为更上层的 JSONTranslator 和 TextTranslator 提供支持。
 */
export class BasicTranslator {
    private readonly qualityPrefix: ClientString;
    private readonly synthesisedPrefix: ClientString;
    private readonly mutatedUniqueNamePrefix: ClientString;
    private readonly influenceStatPrefix1: ClientString;
    private readonly influenceStatPrefix2: ClientString;
    constructor(
        private readonly attributeProvider: AttributeProvider,
        private readonly baseTypeProvider: BaseTypeProvider,
        private readonly passiveSkillProvider: PassiveSkillProvider,
        private readonly propertyProvider: PropertyProvider,
        private readonly requirementProvider: RequirementProvider,
        private readonly skillProvider: SkillProvider,
        private readonly statProvider: StatProvider,
        private readonly stringProvider: StringProvider,
    ) {
        this.qualityPrefix = this.stringProvider.mustProvide("QualityPrefix");
        this.synthesisedPrefix =
            this.stringProvider.mustProvide("SynthesisedPrefix");
        this.mutatedUniqueNamePrefix = this.stringProvider.mustProvide(
            "MutatedUniqueNamePrefix",
        );
        this.influenceStatPrefix1 = this.stringProvider.mustProvide(
            "InfluenceStatPrefix1",
        );
        this.influenceStatPrefix2 = this.stringProvider.mustProvide(
            "InfluenceStatPrefix2",
        );
    }

    /**
     * 翻译 attribute。
     */
    transAttr(
        name: string,
        value?: string,
    ): { name: string; value?: string } | undefined {
        const attr = this.attributeProvider.provideByZh(name);
        if (attr) {
            const en = attr.en;
            if (value && attr.values) {
                for (const v of attr.values) {
                    if (value === v.zh) {
                        return {
                            name: en,
                            value: v.en,
                        };
                    }
                }
            }

            return {
                name: en,
                value: undefined,
            };
        }
        return undefined;
    }

    /**
     * 翻译 attribute name。
     */
    transAttrName(name: string): string | undefined {
        return this.transAttr(name, undefined)?.name;
    }

    /**
     * 翻译 name 和 baseType，用于json数据翻译。
     *
     * 传奇物品的`name`被精确翻译，稀有物品的`name`被翻译为默认名称`Item`，魔法物品和普通物品的`name`保持不变（空字符串）。
     *
     * 可能存在同名的 baseType，传奇物品使用 name 来进行鉴别，否则返回第一个。
     */
    transNameAndBaseType(
        name: string,
        baseType: string,
    ): { name: string; baseType: string } | undefined {
        const baseTypes = this.baseTypeProvider.provideByZh(baseType);
        if (baseTypes === undefined) {
            return undefined;
        }

        if (name.length > 0) {
            let uniqueNamePrefix = "";
            // 处理秽生传奇名称前缀
            if (name.startsWith(this.mutatedUniqueNamePrefix.zh)) {
                uniqueNamePrefix = this.mutatedUniqueNamePrefix.en;
                name = name.substring(this.mutatedUniqueNamePrefix.zh.length);
            }

            const result = this.findUnique(baseTypes, name);
            // 传奇物品
            if (result) {
                return {
                    name: uniqueNamePrefix + result.u.en,
                    baseType: result.b.en,
                };
            }
            // 稀有物品
            return {
                name: DEFAULT_RARITY_ITEM_NAME,
                baseType: baseTypes[0].en,
            };
        }
        // 魔法物品或普通物品
        return { name, baseType: baseTypes[0].en };
    }

    findUnique(
        baseTypes: BaseType[],
        name: string,
    ): { b: BaseType; u: Unique } | undefined {
        for (const b of baseTypes) {
            if (b.uniques) {
                for (const u of b.uniques) {
                    if (u.zh === name) {
                        return { b, u };
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * 翻译 baseType。
     *
     * 可能存在同名的 baseType，返回第一个。
     */
    transBaseType(baseType: string): string | undefined {
        if (!baseType) {
            return undefined;
        }
        return this.baseTypeProvider.provideByZh(baseType)?.[0].en;
    }

    /**
     * 根据 typeLine 推断 BaseType。
     *
     * name 用于匹配传奇，否则返回首个匹配的 BaseType。
     */
    findBaseTypeFromTypeLine(
        typeLine: string,
        name: string,
    ): BaseType | undefined {
        // 传奇物品、稀有物品
        if (name.length > 0) {
            // 秽生传奇
            if (name && name.startsWith(this.mutatedUniqueNamePrefix.zh)) {
                name = name.substring(this.mutatedUniqueNamePrefix.zh.length);
            }

            // 忆境物品
            if (typeLine.startsWith(this.synthesisedPrefix.zh)) {
                typeLine = typeLine.substring(this.synthesisedPrefix.zh.length);
            }

            const baseTypes = this.baseTypeProvider.provideByZh(typeLine);
            if (baseTypes) {
                const result = this.findUnique(baseTypes, name);
                if (result) {
                    return result.b;
                }

                return baseTypes[0];
            }

            return;
        }

        // 魔法物品、普通物品、未鉴定传奇物品、未鉴定稀有物品

        if (typeLine.startsWith(this.qualityPrefix.zh)) {
            typeLine = typeLine.substring(this.qualityPrefix.zh.length);
        }

        if (typeLine.startsWith(this.synthesisedPrefix.zh)) {
            typeLine = typeLine.substring(this.synthesisedPrefix.zh.length);
        }

        // 先检查完整匹配的情况
        const baseTypes = this.baseTypeProvider.provideByZh(typeLine);
        if (baseTypes) {
            return baseTypes[0];
        }

        // 处理修饰词存在的情况。
        //
        // 如“显著的幼龙之大型星团珠宝”，其修饰词为：“显著的”、“幼龙之”，其zhBaseType为“大型星团珠宝”。
        //
        // 修饰词以`的`、`之`结尾，但`的`、`之`同时可能出现在 baseType 中，如`潜能之戒`。
        // 我们可以逐步去除修饰词，来检测剩余部分是否是一个 baseType 。
        const pattern = /.+?[之的]/gu;
        let nextIndex = 0;
        while (nextIndex < typeLine.length) {
            const match = pattern.exec(typeLine);
            if (match) {
                nextIndex = pattern.lastIndex;
                const possible = typeLine.substring(pattern.lastIndex);
                const baseTypes = this.baseTypeProvider.provideByZh(possible);
                if (baseTypes) {
                    return baseTypes[0];
                }
            } else {
                break;
            }
        }

        return;
    }

    /**
     * 翻译 name 和 typeLine，用于文本翻译。
     *
     * typeLine 是 baseType 加上一些修饰词。修饰词可以分为两类，一类是 `意境 ` 和 `精良的 `，一类是与物品词缀相关的修饰词。
     *
     * 第一类修饰词出现在所有相关物品上，不区分稀有度，第二类修饰词仅出现在魔法物品上。
     *
     * 由于第二类修饰词对于POB而言是没有什么作用的，且维护比较麻烦，这里仅支持第一类修饰词的翻译，第二类修饰词被移除。
     */
    transNameAndTypeLine(
        name: string,
        typeLine: string,
    ): { name: string; typeLine: string } | undefined {
        // 传奇物品、稀有物品
        if (name.length > 0) {
            let uniqueNamePrefix = "";
            let typeLinePrefix = "";

            if (name.startsWith(this.mutatedUniqueNamePrefix.zh)) {
                uniqueNamePrefix = this.mutatedUniqueNamePrefix.en;
                name = name.substring(this.mutatedUniqueNamePrefix.zh.length);
            }

            if (typeLine.startsWith(this.synthesisedPrefix.zh)) {
                typeLine = typeLine.substring(this.synthesisedPrefix.zh.length);
                typeLinePrefix += this.synthesisedPrefix.en;
            }
            const baseType = this.findBaseTypeFromTypeLine(typeLine, name);
            if (baseType) {
                if (baseType.uniques) {
                    for (const u of baseType.uniques) {
                        if (u.zh === name) {
                            return {
                                name: uniqueNamePrefix + u.en,
                                typeLine: typeLinePrefix + baseType.en,
                            };
                        }
                    }
                }
                return {
                    name: DEFAULT_RARITY_ITEM_NAME,
                    typeLine: typeLinePrefix + baseType.en,
                };
            }

            return;
        }
        // 魔法物品、普通物品、未鉴定稀有物品、未鉴定传奇物品
        let typeLinePrefix = "";

        if (typeLine.startsWith(this.qualityPrefix.zh)) {
            typeLine = typeLine.substring(this.qualityPrefix.zh.length);
            typeLinePrefix = this.qualityPrefix.en;
        }

        if (typeLine.startsWith(this.synthesisedPrefix.zh)) {
            typeLine = typeLine.substring(this.synthesisedPrefix.zh.length);
            typeLinePrefix += this.synthesisedPrefix.en;
        }
        const baseType = this.findBaseTypeFromTypeLine(typeLine, name);
        if (baseType) {
            return {
                name: "",
                typeLine: typeLinePrefix + baseType.en,
            };
        }

        return;
    }

    /**
     * 翻译技能和辅助技能，辅助技能带有后缀`(辅)`或`（辅）`
     */
    transSkill(name: string): string | undefined {
        return this.skillProvider.provideSkill(name)?.en;
    }

    transSkillProp(name: string): string | undefined {
        return GEM_PROPERTY_MAP.get(name);
    }

    /**
     * 翻译索引的辅助技能，名称不带后缀`(辅)`或`（辅）`
     */
    transIndexableSupports(name: string): string | undefined {
        return this.skillProvider.provideIndexableSupport(name)?.en;
    }

    /**
     * 翻译可涂油天赋。
     */
    transAnointed(name: string): string | undefined {
        return this.passiveSkillProvider.provideAnointedByZh(name)?.en;
    }

    /**
     * 翻译基石天赋。
     */
    transKeystone(name: string): string | undefined {
        return this.passiveSkillProvider.provideKeystoneByZh(name)?.en;
    }

    /**
     * 翻译升华天赋。
     *
     * 不支持菲西雅升华、血脉升华。
     */
    transAscendant(zh: string): string | undefined {
        return this.passiveSkillProvider.provideAscendantByZh(zh)?.en;
    }

    /**
     * 翻译 Property。
     */
    transProperty(
        name: string,
        value: string,
    ): { name: string; value?: string } | undefined {
        const prop = this.propertyProvider.provideByZh(name);
        if (prop) {
            if (prop.values) {
                for (const v of prop.values) {
                    if (value === v.zh) {
                        return {
                            name: prop.en,
                            value: v.en,
                        };
                    }
                }
            }
            return {
                name: prop.en,
            };
        }

        return undefined;
    }

    /**
     * 翻译 property name，用于文本翻译。
     *
     * 这个方法引入了 `动态` property name的概念。
     * 比如`武器范围：1.3 米`，这个文本片段使用了中文符号`：`，而一般的 name:value 的分隔符为英文符号`:`。
     * 因此相比将其解析为 `name:value`，还不如将其整体解析为一个 name 省事。
     *
     * 其中 `1.3` 是动态值，因此这个文本片段需要动态翻译为英文。
     *
     * 对应的 json 数据不存在类似的概念，比如：
     * {name: "武器范围：{0} 米", values: [["1.1", 0]], displayMode: 3, type: 14}
     * name和value是分隔的，只需要静态翻译 name。
     */
    transPropertyName(name: string): string | undefined {
        const prop = this.propertyProvider.provideByZh(name);
        if (prop) {
            return prop.en;
        }

        const props =
            this.propertyProvider.provideVariablePropertiesByZhSkeleton(
                getTextSkeleton(name),
            );
        if (props) {
            for (const prop of props) {
                const zhTmpl = new Template(prop.zh);
                const posParams = zhTmpl.parseParams(name);
                //does not match
                if (posParams === undefined) {
                    continue;
                }

                const enTmpl = new Template(prop.en);
                return enTmpl.render(posParams);
            }
        }

        return undefined;
    }

    /**
     * 翻译 requirement。
     */
    transRequirement(
        name: string,
        value: string,
    ): { name: string; value?: string } | undefined {
        const r = this.requirementProvider.provideByZh(name);
        if (r) {
            if (r.values) {
                for (const v of r.values) {
                    if (v.zh === value) {
                        return { name: r.en, value: v.en };
                    }
                }
            }
            return {
                name: r.en,
            };
        }

        return undefined;
    }

    /**
     * 翻译 requirement name。
     */
    transRequirementName(zhName: string): string | undefined {
        const r = this.requirementProvider.provideByZh(zhName);
        return r?.en;
    }

    /**
     * 翻译 requirement suffix。
     */
    transRequirementSuffix(suffix: string): string | undefined {
        const s = this.requirementProvider.provideSuffixByZh(suffix);
        return s?.en;
    }

    /**
     * 翻译词缀
     */
    transMod(zhMod: string): string | undefined {
        if (zhMod.startsWith(this.influenceStatPrefix1.zh)) {
            const subMod = this.transModInner(
                zhMod.substring(this.influenceStatPrefix1.zh.length),
            );
            if (subMod) {
                return this.influenceStatPrefix1.en + subMod;
            }
        } else if (zhMod.startsWith(this.influenceStatPrefix2.zh)) {
            const subMod = this.transModInner(
                zhMod.substring(this.influenceStatPrefix2.zh.length),
            );
            if (subMod) {
                return this.influenceStatPrefix2.en + subMod;
            }
        }

        return this.transModInner(zhMod);
    }

    private transModInner(zhMod: string): string | undefined {
        const skeleton = getTextSkeleton(zhMod);
        const stats = this.statProvider.provideByZhSkeleton(skeleton);

        if (stats) {
            for (const stat of stats) {
                const result = this.doTransMod(stat, zhMod);
                if (result) {
                    return result;
                }
            }
        } else {
            const referenceStats = this.statProvider.provideReferenceStats();
            for (const stat of referenceStats) {
                const result = this.doTransMod(stat, zhMod);
                if (result) {
                    return result;
                }
            }
        }

        return undefined;
    }

    /**
     * 翻译词缀参数
     */
    private transStatParams(stat: Stat, posParams: Map<number, string>) {
        // 引用的参数值需要进行翻译
        if (stat.refs) {
            for (const [key, refType] of Object.entries(stat.refs)) {
                const pos = parseInt(key, 10);
                if (refType === "anointed_passive") {
                    const zh = posParams.get(pos)!;
                    const en = this.transAnointed(zh);
                    if (en) {
                        posParams.set(pos, en);
                    }
                } else if (refType === "keystone_passive") {
                    const zh = posParams.get(pos)!;
                    const en = this.transKeystone(zh);
                    if (en) {
                        posParams.set(pos, en);
                    } else {
                        console.warn(`untranslated keystone: ${zh}`);
                    }
                } else if (refType === "ascendant_passive") {
                    const zh = posParams.get(pos)!;
                    const en = this.transAscendant(zh);
                    if (en) {
                        posParams.set(pos, en);
                    } else {
                        console.warn(`untranslated ascendant: ${zh}`);
                    }
                } else if (refType === "display_indexable_support") {
                    const zh = posParams.get(0)!;
                    const en = this.transIndexableSupports(zh);
                    if (en) {
                        posParams.set(0, en);
                    } else {
                        console.warn(`untranslated indexable_support: ${zh}`);
                    }
                } else if (refType === "display_indexable_skill") {
                    const zh = posParams.get(0)!;
                    const en = this.transSkill(zh);
                    if (en) {
                        posParams.set(0, en);
                    } else {
                        console.warn(`untranslated indexable_skill: ${zh}`);
                    }
                }
            }
        }
    }

    private doTransMod(stat: Stat, zhMod: string): string | undefined {
        if (zhMod === stat.zh) {
            return stat.en;
        }

        const zhTmpl = new Template(stat.zh);
        const posParams = zhTmpl.parseParams(zhMod);
        // 不匹配
        if (posParams === undefined) {
            return undefined;
        }

        this.transStatParams(stat, posParams);

        const enTmpl = new Template(stat.en);
        return enTmpl.render(posParams);
    }

    /**
     * 翻译 multiline mod。
     *
     * 该方法用于文本翻译，使用贪婪法推断 lines 中可能存在的以首行为首的 multiline mod。
     *
     * @returns {result,lines}, 翻译结果, multiline mod 的行数
     * @returns undefined, 无匹配
     */
    transMultilineMod(
        lines: string[],
    ): { result: string; lineCount: number } | undefined {
        const skeleton = getTextSkeleton(lines[0]);
        const entry = this.statProvider.provideByFirstLineZhSkeleton(skeleton);
        if (entry) {
            for (const multilineStat of entry.stats) {
                const lineSize = multilineStat.lineSize;
                if (multilineStat.lineSize > lines.length) {
                    continue;
                }
                const stat = multilineStat.stat;
                const mod = lines.slice(0, lineSize).join(LINE_SEPARATOR);

                if (getTextSkeleton(stat.zh) === getTextSkeleton(mod)) {
                    const result = this.doTransMod(stat, mod);
                    if (result) {
                        return {
                            result: result,
                            lineCount: lineSize,
                        };
                    }
                }
            }
        } else {
            const stats = this.statProvider.provideMultilineReferenceStats();
            for (const stat of stats) {
                if (lines.length < stat.lineSize) {
                    continue;
                }
                const result = this.doTransMod(
                    stat.stat,
                    lines.slice(0, stat.lineSize).join(LINE_SEPARATOR),
                );
                if (result) {
                    return {
                        result: result,
                        lineCount: stat.lineSize,
                    };
                }
            }
        }

        return undefined;
    }
}
