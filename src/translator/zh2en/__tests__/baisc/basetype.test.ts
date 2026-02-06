import { expect, test } from "vitest";
import { TranslatorFactory } from "../../factory.js";

const factory = new TranslatorFactory();
const basic = factory.getBasicTranslator();

test("丝绸手套 translation", () => {
    const testcases = ["安赛娜丝的安抚之语", "漆黑天顶", "abc"];
    const expected_list = [
        "Silk Gloves",
        "Fingerless Silk Gloves",
        "Fingerless Silk Gloves",
    ];

    for (let i = 0; i < testcases.length; i++) {
        const testcase = testcases[i];
        const expected = expected_list[i];
        const translation = basic.transNameAndBaseType(testcase, "丝绸手套");
        expect(translation?.baseType).toEqual(expected);
    }
});
