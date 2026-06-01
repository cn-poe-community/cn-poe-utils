import fs from "fs";
import path from "path";

const entries = [
    {
        "json": "src/api/__tests__/items.json",
        "type": "GetItemsResult",
        "typeFile": "../item.js"
    },
    {
        "json": "src/api/__tests__/passive_skills.json",
        "type": "GetPassiveSkillsResult",
        "typeFile": "../passive_skill.js"
    },
    {
        "json": "src/data/pob/data.json",
        "tsDir": "src/data/pob/__tests__",
        "type": "Data",
        "typeFile": "../types.js"
    },
    {
        "json": "src/data/poe/data.json",
        "tsDir": "src/data/poe/__tests__",
        "type": "Data",
        "typeFile": "../types.js"
    }
];

for (const entry of entries) {
    const jsonPath = entry.json;
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const jsonBasename = path.basename(jsonPath, ".json");
    const jsonDir = path.dirname(jsonPath);
    const tsFilename = `_${jsonBasename}.type-test.ts`;
    const tsPath = path.join(entry.tsDir ? entry.tsDir : jsonDir, tsFilename);
    const typeImportPath = entry.typeFile;

    const typeName = entry.type;

    if (fs.existsSync(tsPath)) {
        const jsonStat = fs.statSync(jsonPath);
        const tsStat = fs.statSync(tsPath);
        if (tsStat.mtimeMs >= jsonStat.mtimeMs) {
            console.log(`Skipped (up to date): ${tsPath}`);
            continue;
        }
    }

    const tsContent = `import type { ${typeName} } from "${typeImportPath}";\n\nconst _checked: ${typeName} = ${jsonContent};\n`;

    fs.writeFileSync(tsPath, tsContent, "utf-8");
    console.log(`Generated: ${tsPath}`);
}