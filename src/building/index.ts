import * as itemTypes from "../api/item.js";
import * as passiveSkillTypes from "../api/passive_skill.js";
import { type TransformOptions, Transformer } from "./transform/transform.js";
import { PathOfBuilding } from "./xml/PathOfBuilding.js";

export type { TransformOptions };

export function transform(
    items: itemTypes.GetItemsResult,
    passiveSkills: passiveSkillTypes.GetPassiveSkillsResult,
    options?: TransformOptions,
): PathOfBuilding {
    const t = new Transformer(items, passiveSkills, options);
    t.transform();
    return t.getBuilding();
}
