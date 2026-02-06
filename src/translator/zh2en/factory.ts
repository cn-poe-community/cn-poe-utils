import { BaseTypeProvider } from "./provider/base_type.js";
import { RequirementProvider } from "./provider/requirement.js";
import { PropertyProvider } from "./provider/property.js";
import { SkillProvider } from "./provider/skill.js";
import { PassiveSkillProvider } from "./provider/passive_skill.js";
import { StatProvider } from "./provider/stat.js";
import { AttributeProvider } from "./provider/attribute.js";
import { BasicTranslator } from "./basic.js";
import { JsonTranslator } from "./json.js";
import { TextTranslator } from "./text.js";
import { StringProvider } from "./provider/sting.js";

export class TranslatorFactory {
    private basicTranslator: BasicTranslator;

    constructor() {
        const attributeProvider = new AttributeProvider();
        const baseTypeProvider = new BaseTypeProvider();
        const requirementProvider = new RequirementProvider();
        const propertyProvider = new PropertyProvider();
        const passiveSkillProvider = new PassiveSkillProvider();
        const skillProvider = new SkillProvider();
        const statProvider = new StatProvider();
        const stringProvider = new StringProvider();

        this.basicTranslator = new BasicTranslator(
            attributeProvider,
            baseTypeProvider,
            passiveSkillProvider,
            propertyProvider,
            requirementProvider,
            skillProvider,
            statProvider,
            stringProvider,
        );
    }

    getBasicTranslator(): BasicTranslator {
        return this.basicTranslator;
    }
    getJsonTranslator(): JsonTranslator {
        return new JsonTranslator(this.basicTranslator);
    }
    getTextTranslator(): TextTranslator {
        return new TextTranslator(this.basicTranslator);
    }
}
