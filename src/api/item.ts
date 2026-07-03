import type { Character } from "./character.js";

export interface Inventory {
    extra_columns: number;
    /**
     * 金币
     */
    gold: number;
}

export interface Influences {
    redeemer?: boolean;
    shaper?: boolean;
    elder?: boolean;
    crusader?: boolean;
    hunter?: boolean;
    warlord?: boolean;
}

/**
 * 插槽属性，与插槽颜色一一对应。
 *
 * I: Int/智慧, D: Dex/敏捷, S: Str/力量, G: General/通用, A: Abyssal/深渊
 */
export type SocketAttribute = "I" | "D" | "S" | "G" | "A";
/**
 * 插槽颜色。
 * B: Blue/蓝色, G: Green/绿色, R: Red/红色, W: White/白色, A: Abyssal/深渊
 */
export type SocketColour = "B" | "G" | "R" | "W" | "A";

export type Rarity = "Normal" | "Magic" | "Rare" | "Unique";

export interface Socket {
    group: number;
    attr: SocketAttribute;
    sColour: SocketColour;
}

export interface Requirement {
    name: string;
    values: Array<[string, number]>;
    displayMode: number;
    type?: number;
    suffix?: string;
}

export interface Property {
    name: string;
    values: Array<[string, number]>;
    displayMode: number;
    type?: number;
    progress?: number;
}

/**
 * 物品。
 */
export interface Item {
    /**
     * 深渊珠宝
     *
     * 值为true或undefined。
     */
    abyssJewel?: boolean;
    baseType: string;
    /**
     * 已腐化
     */
    corrupted?: boolean;
    craftedMods?: string[];
    /**
     *  熔炉数据
     */
    crucible?: unknown;
    /**
     * 熔炉词缀
     */
    crucibleMods?: string[];
    /**
     * 描述文本
     */
    descrText?: string;
    /**
     * 已复制
     */
    duplicated?: boolean;
    /**
     * @deprecated 使用 influences.elder
     */
    elder?: boolean;
    /**
     * 附魔词缀
     */
    enchantMods?: string[];
    /**
     * 外延词缀
     */
    explicitMods?: string[];
    /**
     * 风味文本
     */
    flavourText?: string[];
    /**
     * 烫金传奇版本
     */
    foilVariation?: number;
    /**
     * 破溃物品
     */
    fractured?: boolean;
    /**
     * 破溃词缀
     */
    fracturedMods?: string[];
    frameType: number;
    frameTypeId: string;
    h: number;
    icon: string;
    /**
     * 嫁接物品的技能没有id
     */
    id?: string;
    /**
     * 已鉴定
     */
    identified: boolean;
    ilvl: number;
    /**
     * 孕育物品
     */
    incubatedItem?: unknown;
    /**
     * 基底词缀
     */
    implicitMods?: string[];
    /**
     * 影响
     */
    influences?: Influences;
    inventoryId?: string;
    isRelic?: boolean;
    league: string;
    /**
     * 秽生物品
     */
    mutated?: boolean;
    /**
     * 秽生词缀
     */
    mutatedMods?: string[];
    name: string;
    properties?: Property[];
    rarity?: Rarity;
    replica?: boolean;
    requirements?: Requirement[];
    /**
     * 天灾词缀
     */
    scourgeMods?: string[];
    searing?: boolean;
    /**
     * 描述文本2，仅限嫁接技能。
     */
    secDescrText?: string;
    /**
     * @deprecated 使用 influences.shaper
     */
    shaper?: boolean;
    /**
     * 插槽中的物品
     *
     * 包括：携带插槽信息的宝石、携带插槽信息的深渊珠宝、宝石（仅限嫁接物品）。
     */
    socketedItems?: ((Socketed & Gem) | (Socketed & AbyssalJewel) | Gem)[];
    sockets?: Socket[];
    /**
     * 已分裂
     */
    split?: boolean;
    synthesised?: boolean;
    tangled?: boolean;
    typeLine: string;
    /**
     * 效用词缀（比如三玉药剂）
     */
    utilityMods?: string[];
    verified: boolean;
    w: number;
    x?: number;
    y?: number;
}

/**
 * 混合技能。
 */
export interface Hybrid {
    isVaalGem?: boolean;
    baseTypeName: string;
    properties?: Property[];
    explicitMods: string[];
    secDescrText: string;
}

/**
 * 宝石/技能。
 *
 * 宝石和技能虽然概念上泾渭分明，但是在API数据中并没有严格区分。
 */
export interface Gem extends Item {
    /**
     * 是辅助？
     *
     * 只有嫁接技能(S28)没有这个字段。
     */
    support?: boolean;
    additionalProperties?: Property[];
    secDescrText: string;
    nextLevelRequirements?: Property[];
    /**
     * 部分技能会包含额外的技能。
     */
    hybrid?: Hybrid;
    /**
     * 技能可内置辅助技能。
     */
    builtInSupport?: string;
}

export interface AbyssalJewel extends Item {
    abyssJewel: boolean;
    rarity: Rarity;
}

/**
 * 插槽物品的插槽信息。
 */
export interface Socketed {
    socket: number;
    /**
     * 深渊珠宝的该属性为null
     */
    colour: SocketAttribute | null;
}

export type GetItemsResult = {
    items: Item[];
    character: Character;
    /**
     * 仅存在于获取当前Session的角色物品时
     */
    inventory?: Inventory;
};
