const express = require("express");
const router = express.Router();
const { Model } = require("../models"); // Подключаем модель

// Получить модели по category_id
router.get("/", async (req, res) => {
    try {
        const { category_id } = req.query;

        if (!category_id) {
            return res.status(400).json({ error: "Не указан category_id" });
        }

        const models = await Model.findAll({ where: { category_id } });

        res.json(models);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Добавить новую модель
router.post("/", async (req, res) => {
    const { name, image_path, category_id } = req.body;
    try {
        const newModel = await Model.create({ name, image_path, category_id });
        res.json(newModel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при добавлении модели" });
    }
});

module.exports = router;
