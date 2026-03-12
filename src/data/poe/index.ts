import * as data from "./data.js";
import type { Data, Stat } from "./types.js";

export * from "./types.js";

export const DATA: Data = {
    amulets: data.amulets,
    belts: data.belts,
    bodyArmours: data.bodyArmours,
    boots: data.boots,
    flasks: data.flasks,
    gloves: data.gloves,
    helmets: data.helmets,
    jewels: data.jewels,
    quivers: data.quivers,
    rings: data.rings,
    shields: data.shields,
    tattoos: data.tattoos,
    tinctures: data.tinctures,
    weapons: data.weapons,
    gemSkills: data.gemSkills,
    hybridSkills: data.hybridSkills,
    indexableSupports: data.indexableSupports,
    transfiguredSkills: data.transfiguredSkills,
    anointed: data.anointed,
    ascendant: data.ascendant,
    keystones: data.keystones,
    // 当前版本/配置的TS会报类型错误，使用强制转换
    stats: data.stats as Stat[],
    attributes: data.attributes,
    properties: data.properties,
    requirements: data.requirements,
    requirementSuffixes: data.requirementSuffixes,
    strings: data.strings,
};
