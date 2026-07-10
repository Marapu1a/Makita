require("dotenv").config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const router = express.Router();

// Папка для хранения загруженного прайса
const uploadDir = path.join(__dirname, '../script');
const backupDir = path.join(uploadDir, 'backups');

const upload = multer({ dest: uploadDir });

// Имена файлов по типу загрузки
const FILE_KINDS = {
    result: 'result.xlsx',              // основной источник (обязателен)
    site: 'makita_site_update.xlsx',    // выгрузка центрального сайта (опционален, применяется поверх)
};

// Роут для загрузки прайса: kind = result | site
router.post('/upload-price', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не был загружен' });
    }

    const kind = req.body.kind || 'result';
    const targetName = FILE_KINDS[kind];
    if (!targetName) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: `Неизвестный тип файла: ${kind}` });
    }

    const targetPath = path.join(uploadDir, targetName);

    fs.rename(req.file.path, targetPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Ошибка при сохранении файла' });
        }
        res.json({ message: `Файл ${targetName} успешно загружен` });
    });
});

// Роут для запуска скрипта обновления — возвращает отчёт скрипта
router.post('/update-prices', (req, res) => {
    const scriptPath = path.join(__dirname, '../script/prices_update.py');

    if (!fs.existsSync(path.join(uploadDir, FILE_KINDS.result))) {
        return res.status(400).json({ message: 'Сначала загрузите result.xlsx' });
    }

    exec(`python3 ${scriptPath}`, { timeout: 10 * 60 * 1000 }, (error, stdout, stderr) => {  // Локально нужно python без "3"
        if (error) {
            console.error(`Ошибка скрипта: ${error.message}\n${stderr}`);
            return res.status(500).json({
                message: 'Ошибка при обновлении',
                report: `${stderr || error.message}`,
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({ message: 'Обновление завершено', report: stdout });
    });
});

// Роут для создания бэкапа вручную (адаптирован под Windows)
router.post('/backup-db', (req, res) => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").split("T").join("_").slice(0, 16);
    const backupFile = `backup_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFile);

    const {
        DB_USER,
        DB_PASSWORD,
        DB_NAME,
        DB_HOST,
        DB_PORT
    } = process.env;

    // Формируем команду и подставляем пароль через env (для Windows)
    const dumpCommand = `pg_dump -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -d ${DB_NAME} -f "${backupPath}"`;

    const env = {
        ...process.env,
        PGPASSWORD: DB_PASSWORD,
    };

    exec(dumpCommand, { env }, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Ошибка при создании бэкапа:", error.message);
            return res.status(500).json({ message: 'Ошибка создания бэкапа' });
        }

        console.log("✅ Бэкап создан вручную:", backupFile);
        res.json({ message: 'Бэкап успешно создан' });
    });
});

module.exports = router;
