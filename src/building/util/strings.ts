export function parseIntOrDefault(
    text: string | undefined,
    def: number,
): number {
    if (text === undefined) {
        return def;
    }
    const num = parseInt(text);
    return isNaN(num) ? def : num;
}
