const ENEMY_SHAPER = "Pinnacle";

export class Config {
    activeConfigSet: ConfigSet;

    constructor() {
        this.activeConfigSet = new ConfigSet();
    }

    toString(): string {
        return `<Config activeConfigSet="1">
${this.activeConfigSet}
</Config>`;
    }
}

export class ConfigSet {
    enemyIsBoss = ENEMY_SHAPER;

    toString(): string {
        const inputs: Input[] = [];
        for (const [prop, val] of Object.entries(this)) {
            if (val !== undefined) {
                const input = new Input(
                    prop,
                    typeof val as "string" | "number" | "boolean",
                    val,
                );
                inputs.push(input);
            }
        }

        const inputsView = inputs.map((input) => input.toString()).join("\n");

        return `<ConfigSet id="1" title="Default">
${inputsView}
</ConfigSet>`;
    }
}

class Input {
    name: string;
    type: "string" | "number" | "boolean";
    val: string | number | boolean;

    constructor(
        name: string,
        type: "string" | "number" | "boolean",
        val: string,
    ) {
        this.name = name;
        this.type = type;
        this.val = val;
    }

    toString(): string {
        return `<Input name="${this.name}" ${this.type}="${this.val}"/>`;
    }
}
