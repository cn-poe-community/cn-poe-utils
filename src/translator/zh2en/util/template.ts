interface PlaceholderInfo {
    index: number; // 占位符索引
}

export class Template {
    private template: string;
    private placeholders: PlaceholderInfo[] = [];
    private staticParts: string[] = [];

    constructor(template: string) {
        this.template = template;
        this.parseTemplate();
    }

    /**
     * 在构造函数中解析模板，提取占位符信息
     */
    private parseTemplate(): void {
        const regex = /\{(\d+)\}/g;
        const placeholders: PlaceholderInfo[] = [];
        const staticParts: string[] = [];

        let lastIndex = 0;
        let match;

        while ((match = regex.exec(this.template)) !== null) {
            const placeholderIndex = parseInt(match[1], 10);
            const start = match.index;
            const end = start + match[0].length;

            // 收集占位符前的静态文本
            const before = this.template.substring(lastIndex, start);
            staticParts.push(before);

            // 存储占位符信息
            placeholders.push({
                index: placeholderIndex,
            });

            lastIndex = end;
        }

        // 收集最后一个占位符后的静态文本
        const lastPart = this.template.substring(lastIndex);
        staticParts.push(lastPart);

        this.placeholders = placeholders;
        this.staticParts = staticParts;
    }

    /**
     * 解析渲染结果，得到位置参数与实际参数值的映射表
     * @param str 已渲染的字符串
     * @returns 参数映射表，key为位置索引，value为对应的参数值，如果渲染结果与模板不匹配，返回undefined
     */
    parseParams(str: string): Map<number, string> | undefined {
        // 如果没有占位符，直接返回空Map
        if (this.placeholders.length === 0) {
            if (str === this.template) {
                return new Map();
            }

            return;
        }

        const result = new Map<number, string>();

        let strIndex = 0;

        // 处理第一个静态部分
        const firstStaticPart = this.staticParts[0];
        if (!str.startsWith(firstStaticPart)) {
            return undefined;
        }
        strIndex += firstStaticPart.length;

        // 解析每个占位符
        for (let i = 0; i < this.placeholders.length; i++) {
            const placeholder = this.placeholders[i];
            const nextStaticPart = this.staticParts[i + 1];

            // 查找下一个静态部分
            let endPos: number;

            if (nextStaticPart.length > 0) {
                // 有后续静态文本，匹配到它的位置
                endPos = str.indexOf(nextStaticPart, strIndex);
                if (endPos === -1) {
                    return undefined;
                }
            } else {
                // 没有后续静态文本，匹配到字符串结束
                endPos = str.length;
            }

            // 提取参数值
            const paramValue = str.substring(strIndex, endPos);
            result.set(placeholder.index, paramValue);

            // 跳过已匹配的部分
            strIndex = endPos + nextStaticPart.length;
        }

        // 验证整个字符串是否匹配完成
        if (strIndex !== str.length) {
            return undefined;
        }

        return result;
    }

    /**
     * 渲染模板
     * @param paramMap 参数映射表，可以是数组、对象或Map
     * @returns 渲染后的字符串
     */
    render(paramMap: Map<number, string>): string {
        if (this.placeholders.length === 0) {
            return this.template;
        }

        // 构建渲染结果
        const builder = Array<string>(
            this.placeholders.length + this.staticParts.length,
        );
        let pos = 0;

        for (let i = 0; i < this.placeholders.length; i++) {
            const placeholder = this.placeholders[i];
            builder[pos++] = this.staticParts[i];

            const paramIndex = placeholder.index;
            builder[pos++] = String(paramMap.get(paramIndex));
        }

        // 添加最后一个静态部分
        builder[pos] = this.staticParts[this.staticParts.length - 1];

        return builder.join("");
    }
}
