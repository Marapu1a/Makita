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

// Роут для загрузки прайса
router.post('/upload-price', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не был загружен' });
    }

    const targetPath = path.join(uploadDir, 'price.xlsx');

    // Перемещаем файл и переименовываем
    fs.rename(req.file.path, targetPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Ошибка при сохранении файла' });
        }
        res.json({ message: 'Файл успешно загружен' });
    });
});

// Роут для запуска скрипта обновления
router.post('/update-prices', (req, res) => {
    const scriptPath = path.join(__dirname, '../script/prices_update.py');

    exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {  // Локально нужно python без "3"
        if (error) {
            console.error(`Ошибка запуска скрипта: ${error.message}`);
            return res.status(500).json({ message: 'Ошибка запуска скрипта' });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        res.json({ message: 'Обновление базы запущено' });
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
