export const LINE_SEPARATOR = "\n";

/**
 * 获取字符串的骨架。
 *
 * 通过去除字符串中的`{`, `}`, 数字（包括符号、小数）实现。
 */
export function getTextSkeleton(text: string): string {
    return text.replace(/[{}\d.+-]/gu, "");
}
