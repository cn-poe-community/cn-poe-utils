import { BasicTranslator } from "./basic.js";
import {
    ZH_CLASS_SCION,
    ZH_FORBIDDEN_FLAME,
    ZH_FORBIDDEN_FLESH,
    ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN,
    ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN_FIXED,
} from "./json.js";

export class TextTranslator {
    constructor(readonly basic: BasicTranslator) {}

    /**
     * 翻译物品文本
     * @param content 物品文本，使用`\n`作为行分隔符
     */
    public trans(content: string): string {
        const item = new Text(this.preHandle(content));
        const ctx = new Context(this);
        return item.getTranslation(ctx);
    }

    /**
     * 与翻译 json 的过程类似，对官方中文化引入的 bug 进行 hack
     */
    private preHandle(content: string): string {
        if (
            content.includes(ZH_FORBIDDEN_FLESH) ||
            content.includes(ZH_FORBIDDEN_FLAME)
        ) {
            if (content.includes(ZH_CLASS_SCION)) {
                content = content.replace(
                    ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN,
                    ZH_PASSIVE_SKILL_ASCENDANT_ASSASSIN_FIXED,
                );
            }
        }

        // S26 赛季武器附魔引入的中文词缀重复问题
        content = content.replaceAll(
            /^元素伤害(提高|降低) \d+% \(enchant\)$/gm,
            (line) => "该武器的" + line,
        );

        return content;
    }
}

class Context {
    translator: TextTranslator;
    item?: Text;
    section?: Section;

    constructor(translator: TextTranslator) {
        this.translator = translator;
    }
}

const SECTION_SEPARATOR = "\n--------\n";
const LINE_SEPARATOR = "\n";
const KEY_VALUE_SEPARATOR = ": ";

const ZH_PROPERTY_ITEM_CLASS = "物品类别";

/**
 * 文本物品。
 */
class Text {
    sections: Section[];

    constructor(content: string) {
        const sections = content.split(SECTION_SEPARATOR);

        this.sections = sections.map((content) => {
            if (content.startsWith(ZH_PROPERTY_ITEM_CLASS)) {
                return new MetaSection(content);
            }
            return new Section(content);
        });
    }

    getTranslation(ctx: Context): string {
        ctx.item = this;
        return this.sections
            .map((section) => section.getTranslation(ctx))
            .join(SECTION_SEPARATOR);
    }
}

/**
 * 分区
 *
 * 将文本基于分隔符`--------`切分，得到的单元
 */
class Section {
    lines: Line[];

    constructor(content: string) {
        const linesContents = content.split(LINE_SEPARATOR);
        this.lines = linesContents.map((lineContent) =>
            Line.NewLine(lineContent),
        );
    }

    /**
     * 获取分区的翻译
     *
     * 默认实现基于 Mod 分区，这是最常见的情况，子类型的分区需要覆盖该方法
     */
    getTranslation(ctx: Context): string {
        ctx.section = this;
        const translator = ctx.translator;
        const builder: string[] = [];

        const linesWithoutSuffix = this.lines.map((line) =>
            line instanceof ModLine ? line.mod : line.content,
        );

        for (let i = 0; i < this.lines.length; ) {
            // 检查后续行是否是 multiline mod
            const result = translator.basic.transMultilineMod(
                linesWithoutSuffix.slice(i),
            );
            if (result) {
                builder.push(
                    this.fillSuffixesToMultilineModTranslation(
                        this.lines.slice(i, result.lineCount),
                        result.result,
                    ),
                );
                i += result.lineCount;
                continue;
            }

            builder.push(this.lines[i].getTranslation(ctx));
            i++;
        }

        return builder.join(LINE_SEPARATOR);
    }

    /**
     * 给带有后缀的 multiline mod 的翻译结果的每行添加后缀
     */
    fillSuffixesToMultilineModTranslation(
        mod: Line[],
        translation: string,
    ): string {
        const slices = translation.split(LINE_SEPARATOR);
        const buf: string[] = [];

        for (const [i, slice] of slices.entries()) {
            const sub = mod[i];
            if (sub instanceof ModLine && sub.suffix) {
                buf.push(`${slice} ${sub.suffix}`);
            } else {
                buf.push(slice);
            }
        }

        return buf.join(LINE_SEPARATOR);
    }
}

/**
 * 元信息分区
 */
class MetaSection extends Section {
    rarity: string;

    constructor(content: string) {
        super(content);
        for (const line of this.lines) {
            if (line instanceof KeyValueLine) {
                this.rarity = (line as KeyValueLine).value;
                break;
            }
        }
        this.rarity = "";
    }

    getTranslation(ctx: Context): string {
        ctx.section = this;
        const translator = ctx.translator;
        const buf = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            // 对于稀有和传奇物品，末尾两行为：name,typeLine
            // 对于魔法物品，末尾只有 typeLine 行
            if (this.isNameLine(i)) {
                const name = line.content;
                const typeLine = this.lines[this.lines.length - 1].content;
                const result = translator.basic.transNameAndTypeLine(
                    name,
                    typeLine,
                );
                if (result) {
                    buf.push(result.name);
                    buf.push(result.typeLine);
                } else {
                    buf.push(name);
                    buf.push(typeLine);
                }
                //因为这里写入了 typeLine，所以到达了末尾
                i++;
            } else if (this.isTypeLine(i)) {
                const result = translator.basic.transNameAndTypeLine(
                    "",
                    line.content,
                );
                buf.push(result ? result.typeLine : line.content);
            } else {
                buf.push(line.getTranslation(ctx));
            }
        }
        return buf.join(LINE_SEPARATOR);
    }

    isNameLine(lineNum: number): boolean {
        // 目前的检查逻辑比较简单，后续可能考虑通过检查稀有度字段来实现
        return (
            lineNum === this.lines.length - 2 &&
            this.lines[lineNum] instanceof ModLine
        );
    }

    isTypeLine(lineNum: number): boolean {
        return (
            lineNum === this.lines.length - 1 &&
            this.lines[lineNum] instanceof ModLine
        );
    }
}

class Line {
    content: string;

    protected constructor(content: string) {
        this.content = content;
    }

    static NewLine(content: string): Line {
        if (content.includes(KEY_VALUE_SEPARATOR)) {
            const pair = content.split(KEY_VALUE_SEPARATOR);
            if (pair.length !== 2) {
                return new ModLine(content);
            } else {
                return new KeyValueLine(content, pair[0], pair[1]);
            }
        } else if (content.endsWith(":")) {
            return new OnlyKeyLine(content);
        } else {
            return new ModLine(content);
        }
    }

    getTranslation(ctx: Context): string {
        return this.content;
    }
}

class KeyValueLine extends Line {
    key: string;
    value: string;

    constructor(content: string, key: string, value: string) {
        super(content);
        this.key = key;
        this.value = value;
    }

    getTranslation(ctx: Context): string {
        const translator = ctx.translator;
        let result = translator.basic.transProperty(this.key, this.value);
        if (result) {
            let value = this.value;
            if (result.value) {
                value = result.value;
            }
            return `${result.name}${KEY_VALUE_SEPARATOR}${value}`;
        }

        result = translator.basic.transRequirement(this.key, this.value);
        if (result) {
            let value = this.value;
            if (result.value) {
                value = result.value;
            }
            return `${result.name}${KEY_VALUE_SEPARATOR}${value}`;
        }

        result = translator.basic.transAttr(this.key, this.value);

        if (result) {
            let value = this.value;
            if (result.value) {
                value = result.value;
            }
            return `${result.name}${KEY_VALUE_SEPARATOR}${value}`;
        }

        return `${this.key}${KEY_VALUE_SEPARATOR}${this.value}`;
    }
}

class OnlyKeyLine extends Line {
    key: string;
    constructor(content: string) {
        super(content);
        this.key = content.substring(0, content.length - 1);
    }

    getTranslation(ctx: Context): string {
        const translator = ctx.translator;
        let result = translator.basic.transPropertyName(this.key);
        if (result) {
            return `${result}${KEY_VALUE_SEPARATOR}`;
        }
        result = translator.basic.transAttrName(this.key);
        if (result) {
            return `${result}${KEY_VALUE_SEPARATOR}`;
        }

        return `${this.key}${KEY_VALUE_SEPARATOR}`;
    }
}

class ModLine extends Line {
    mod: string;
    suffix?: string;

    constructor(content: string) {
        super(content);
        const pattern = new RegExp("(.+)\\s(\\(\\w+\\))$");
        const match = pattern.exec(content);
        if (match) {
            this.mod = match[1];
            this.suffix = match[2];
        } else {
            this.mod = content;
        }
    }

    getTranslation(ctx: Context): string {
        const translator = ctx.translator;
        let result = translator.basic.transMod(this.mod);
        if (result) {
            if (this.suffix) {
                return `${result} ${this.suffix}`;
            }
            return result;
        }

        // Some lines are properties or attributes
        result = translator.basic.transPropertyName(this.mod);
        if (result) {
            return result;
        }

        result = translator.basic.transAttrName(this.mod);
        if (result) {
            return result;
        }

        return this.content;
    }
}
