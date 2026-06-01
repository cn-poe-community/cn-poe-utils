import fs from "fs";
import path from "path";

const srcDir = "src/api/__tests__";
const destDir = "go/api/testdata";

const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".json"));

for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    const srcStat = fs.statSync(srcPath);

    if (fs.existsSync(destPath)) {
        const destStat = fs.statSync(destPath);
        if (destStat.mtimeMs >= srcStat.mtimeMs) {
            console.log(`Skipped (up to date): ${destPath}`);
            continue;
        }
    }

    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${destPath}`);
}