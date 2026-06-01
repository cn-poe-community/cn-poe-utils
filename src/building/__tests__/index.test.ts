import { test } from "vitest";
import { TranslatorFactory } from "../../translator/zh2en/index.js";
import { transform } from "../index.js";
import fs from "fs";

import itemsData from "../../api/__tests__/items.json" with { type: "json" };
import passiveSkillsData from "../../api/__tests__/passive_skills.json" with { type: "json" };
import { GetItemsResult } from "../../api/item.js";
import { GetPassiveSkillsResult } from "../../api/passive_skill.js";

const factory = new TranslatorFactory();
const jsonTranslator = factory.getJsonTranslator();

test("transform", () => {
    const items = itemsData as GetItemsResult;
    const passiveSkills = passiveSkillsData as GetPassiveSkillsResult;

    jsonTranslator.transItems(items);
    jsonTranslator.transPassiveSkills(passiveSkills);
    const building = transform(items, passiveSkills);

    fs.writeFileSync(
        "D:\\AppsInDisk\\PathOfBuildingCommunity\\Builds\\test.xml",
        building.toString(),
    );
});
