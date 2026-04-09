import { expect, test } from "vitest";

import { TranslatorFactory } from "../../factory.js";

const factory = new TranslatorFactory();
const basic = factory.getBasicTranslator();

const mods = [
    ["增加 8 个天赋技能", "Adds 8 Passive Skills"],
    ["所有 电球 宝石等级 +3", "+3 to Level of all Spark Gems"],
    [
        "插入的技能石被 8 级的精准破坏辅助",
        "Socketed Gems are Supported by Level 8 Controlled Destruction",
    ],
];

test("mods translations", () => {
    for (let i = 0; i < mods.length; i++) {
        const zh = mods[i][0];
        const en = mods[i][1];
        const val = basic.transMod(zh);
        expect(val).toEqual(en);
    }
});

const zhEldritchImplicitMods = [
    "有一个传奇怪物出现在你面前：法术附加 {0} - {1} 基础物理伤害",
    "有一个异界图鉴最终首领出现在你面前：冰霜净化的光环效果提高 {0}%",
];
const enEldritchImplicitMods = [
    "While a Unique Enemy is in your Presence, Adds {0} to {1} Physical Damage to Spells",
    "While a Pinnacle Atlas Boss is in your Presence, Purity of Ice has {0}% increased Aura Effect",
];

test("eldritch implicit mods translations", () => {
    for (let i = 0; i < zhEldritchImplicitMods.length; i++) {
        const zh = zhEldritchImplicitMods[i];
        const en = enEldritchImplicitMods[i];
        const val = basic.transMod(zh);
        expect(val).toEqual(en);
    }
});
