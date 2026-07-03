import type { Item } from "./item.js";

export interface JewelData {
    [key: string]: JewelDatum;
}

export interface JewelDatum {
    type: string;
    radius?: number;
    radiusMin?: number;
    radiusVisual?: string;
    subgraph?: Subgraph;
}

export interface ClusterJewelDatum extends JewelDatum {
    subgraph: Subgraph;
}

export interface Subgraph {
    groups: Groups;
    nodes: { [key: string]: Node };
}

export interface Groups {
    [key: string]: Expansion;
}

export interface Expansion {
    proxy: string;
    nodes: string[];
    x: number;
    y: number;
    orbits: number[];
}

export interface Node {
    skill: string;
    name?: string;
    icon?: string;
    isMastery?: boolean;
    stats?: string[];
    group: string;
    orbit: number;
    orbitIndex: number;
    out: string[];
    in: string[];
    isJewelSocket?: boolean;
    expansionJewel?: ExpansionJewel;
    reminderText?: string[];
    isNotable?: boolean;
    grantedStrength?: number;
    grantedDexterity?: number;
}

export interface ExpansionJewel {
    size: number;
    index: number;
    proxy: string;
    parent: string;
}

export interface SkillOverride {
    activeEffectImage: string;
    /**
     * 激活时图标，仅限于Mastery技能
     */
    activeIcon?: string;
    flavorText?: string;
    grantedDexterity?: number;
    grantedIntelligence?: number;
    grantedStrength?: number;
    icon: string;
    /**
     * 未激活时图标，仅限于Mastery技能
     */
    inactiveIcon?: string;
    /**
     * 以下isXXX字段只有在值为true时才存在
     */
    isKeystone?: boolean;
    isNotable?: boolean;
    isTattoo?: boolean;
    isMastery?: boolean;
    name: string;
    reminderText?: string[];
    stats: string[];
}

export type MasteryEffects =
    | {
          [key: string]: number;
      }
    | [];

export interface SkillOverrides {
    [key: string]: SkillOverride;
}

export type GetPassiveSkillsResult = {
    character: number;
    ascendancy: number;
    alternate_ascendancy: number;
    hashes: number[];
    hashes_ex: number[];
    mastery_effects: MasteryEffects;
    skill_overrides: SkillOverrides;
    /**
     * 天赋树插槽中的物品，包括：普通珠宝、星团珠宝、深渊珠宝
     */
    items: Item[];
    jewel_data: JewelData;
};
