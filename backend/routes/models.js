const express = require('express');
const router = express.Router();
const { Model } = require('../models'); // Подключаем модель

// Получить все модели
router.get('/', async (req, res) => {
    try {
        const models = await Model.findAll();
        res.json(models);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить новую модель
router.post('/', async (req, res) => {
    const { name, image_path } = req.body;
    try {
        const newModel = await Model.create({ name, image_path });
        res.json(newModel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при добавлении модели' });
    }
});

// Удалить модель по ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await Model.destroy({
            where: { id }
        });

        if (deleted) {
            res.status(200).json({ message: `Model with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Model not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
