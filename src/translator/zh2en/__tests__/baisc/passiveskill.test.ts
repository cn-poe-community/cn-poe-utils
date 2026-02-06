import { expect, test } from "vitest";

import { TranslatorFactory } from "../../factory.js";

const factory = new TranslatorFactory();
const basic = factory.getBasicTranslator();

test("ascendants translation", () => {
    const testcases = ["自然之怒"];
    const expected_list = ["Fury of Nature"];

    for (let i = 0; i < testcases.length; i++) {
        const testcase = testcases[i];
        const expected = expected_list[i];
        const translation = basic.transAscendant(testcase);
        expect(translation).toEqual(expected);
    }
});
