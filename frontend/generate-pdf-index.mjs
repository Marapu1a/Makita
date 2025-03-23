import { readdir, stat, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const baseDir = join(cwd(), "public", "images");
const outputFile = join(cwd(), "public", "pdf-index.json");

const sanitizeName = (name) => name.replace(".pdf", "_PDF");

const collectPdfs = async () => {
    const result = [];

    const categoryDirs = await readdir(baseDir, { withFileTypes: true });

    for (const dir of categoryDirs) {
        if (!dir.isDirectory()) continue;

        const category = dir.name;
        const categoryPath = join(baseDir, category);
        const files = await readdir(categoryPath);

        for (const file of files) {
            const fullPath = join(categoryPath, file);
            const isFile = (await stat(fullPath)).isFile();
            const isPdf = file.toLowerCase().endsWith(".pdf");

            if (isFile && isPdf) {
                result.push({
                    name: sanitizeName(file),
                    path: `/images/${category}/${file}`,
                    category: category,
                });
            }
        }
    }

    await writeFile(outputFile, JSON.stringify(result, null, 2), "utf-8");
    console.log(`✅ Сгенерирован pdf-index.json (${result.length} PDF)`);
};

collectPdfs().catch((err) => {
    console.error("❌ Ошибка генерации:", err);
});
