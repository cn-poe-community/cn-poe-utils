import { parseIntOrDefault } from "../util/strings.js";
import { isTransfiguredSkill } from "../transform/gem.js";
import * as itemTypes from "../../api/item.js";

export class Skills {
    skillSet = new SkillSet();

    public toString(): string {
        return `<Skills activeSkillSet="1">
${this.skillSet}
</Skills>`;
    }
}

export class SkillSet {
    skills: Skill[] = [];
    public toString(): string {
        const skillsView = this.skills
            .map((skill) => skill.toString())
            .join("\n");
        return `<SkillSet id="1">
${skillsView}
</SkillSet>`;
    }
}

// 1. skills only depend on link, two active gems can be in one skill
// 2. vaal gem is treated as one gem
// 3. computed gem(like Arcanist Brand) is treated as one gem
export class Skill {
    slot = "";
    gems: Gem[] = [];

    constructor(slotName: string, jsonList: itemTypes.Gem[]) {
        this.slot = slotName;
        for (const json of jsonList) {
            this.gems.push(...Gem.parseJson(json));
        }
    }

    public toString(): string {
        const gemsView = this.gems.map((gem) => gem.toString()).join("\n");

        return `<Skill enabled="true" slot="${this.slot}" mainActiveSkill="nil">
${gemsView}
</Skill>`;
    }
}

export class Gem {
    level = 20;
    qualityId = "Default";
    quality = 0;
    nameSpec = "";
    enableGlobal1 = true;
    enableGlobal2 = false;

    private constructor() {}

    static parseJson(json: itemTypes.Gem): Gem[] {
        const result = [];
        const skill = new Gem();
        let buildInSupport: Gem | undefined = undefined;

        const propMap = new Map<string, itemTypes.Property>();
        if (json.properties) {
            json.properties.forEach((prop) => propMap.set(prop.name, prop));
        }
        skill.level = parseIntOrDefault(propMap.get("Level")?.values[0][0], 20);
        try {
            skill.quality = parseIntOrDefault(
                propMap.get("Quality")?.values[0][0],
                0,
            );
        } catch (e) {
            console.log(json);
            throw e;
        }

        skill.nameSpec = json.baseType.replace(" Support", "");
        if (json.hybrid && json.hybrid.isVaalGem) {
            const hybridBaseTypeName = json.hybrid.baseTypeName;
            if (isTransfiguredSkill(hybridBaseTypeName)) {
                skill.nameSpec =
                    skill.nameSpecOfVaalTransfiguredGem(hybridBaseTypeName);
            }
        }

        if (skill.isVaalGem()) {
            skill.enableGlobal1 = false;
            skill.enableGlobal2 = true;
        }

        if (json.builtInSupport) {
            // 从类似`Supported by Level 1 Damage on Full Life`的文本中提取出`1`,`Damage on Full Life`
            const builtInSupport = json.builtInSupport;
            const match = builtInSupport.match(/Supported by Level (\d+) (.+)/);
            if (match) {
                const level = match[1];
                const support = match[2];
                buildInSupport = new Gem();
                buildInSupport.level = parseIntOrDefault(level, 1);
                buildInSupport.nameSpec = support;
            }else{
                console.error(`Failed to parse gem builtInSupport: ${builtInSupport}`);
            }
        }

        result.push(skill);
        if (buildInSupport) {
            result.push(buildInSupport);
        }
        return result;
    }

    nameSpecOfVaalTransfiguredGem(transfiguredGemName: string): string {
        return "Vaal " + transfiguredGemName;
    }

    isVaalGem() {
        return this.nameSpec.startsWith("Vaal ");
    }

    public toString(): string {
        return `<Gem level="${this.level}" qualityId="${this.qualityId}" \
quality="${this.quality}" nameSpec="${this.nameSpec}" enabled="true" \
enableGlobal1="${this.enableGlobal1}" enableGlobal2="${this.enableGlobal2}"/>`;
    }
}
