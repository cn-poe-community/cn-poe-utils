import { test } from "vitest";
import { items } from "./testcase/items.js";
import { passiveSkills } from "./testcase/passive_skills.js";
import { TranslatorFactory } from "../translator/zh2en/index.js";
import { transform } from "../building/index.js";
import { writeFileSync } from "node:fs";

const factory = new TranslatorFactory();
const jsonTranslator = factory.getJsonTranslator();

test("transform", () => {
    jsonTranslator.transItems(items);
    jsonTranslator.transPassiveSkills(passiveSkills);
    const building = transform(items, passiveSkills);

    writeFileSync("building.xml", building.toString());
});
