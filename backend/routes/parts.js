const express = require('express');
const router = express.Router();
const { Part } = require('../models'); // Подключаем модель

// Получить все детали
router.get('/', async (req, res) => {
    try {
        const parts = await Part.findAll();
        res.json(parts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить детали по ID модели
router.get('/model/:modelId', async (req, res) => {
    const { modelId } = req.params;
    try {
        const parts = await Part.findAll({ where: { model_id: modelId } });
        res.json(parts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
