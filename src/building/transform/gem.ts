import { DATA as POE_DATA } from "../../data/poe/index.js";

const transfiguredSkillSet = new Set(
    POE_DATA.transfiguredSkills.map((skill) => skill.en),
);

/**
 * 判断是否为改造技能。
 */
export function isTransfiguredSkill(name: string): boolean {
    return transfiguredSkillSet.has(name);
}
