import { readdir, rename } from 'fs/promises';
import { extname, basename, join } from 'path';

const folderPath = 'D:/sites/makita-parts/frontend/public/images/categories'; // Укажи свою папку

try {
    const files = await readdir(folderPath);

    for (const file of files) {
        const ext = extname(file).toLowerCase();
        const oldPath = join(folderPath, file);
        const newPath = join(folderPath, basename(file, ext) + '.webp');

        if (ext && ext !== '.webp') {
            await rename(oldPath, newPath);
            console.log(`Переименовано: ${file} -> ${basename(newPath)}`);
        }
    }
} catch (err) {
    console.error('Ошибка:', err);
}
