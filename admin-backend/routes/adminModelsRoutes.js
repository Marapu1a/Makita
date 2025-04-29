const express = require("express");
const { Model, Categories } = require("../models");
const router = express.Router();

// Получить список моделей по категории
router.get("/admin/models", async (req, res) => {
    try {
        const { category_id } = req.query;
        if (!category_id) {
            return res.status(400).json({ success: false, error: "Не указан category_id" });
        }

        const models = await Model.findAll({
            where: { category_id },
            include: [{ model: Categories, as: "category", attributes: ["name"] }],
        });

        const modelsWithCategory = models.map((model) => ({
            id: model.id,
            name: model.name,
            image_path: model.image_path,
            category_id: model.category_id,
            category_name: model.category?.name || "Неизвестно",
        }));

        res.json({ success: true, data: modelsWithCategory });
    } catch (err) {
        console.error("Ошибка при получении моделей:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

// Получить одну модель по ID
router.get("/admin/models/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;

        const model = await Model.findOne({
            where: { id: modelId },
            include: [{ model: Categories, as: "category", attributes: ["name"] }],
        });

        if (!model) {
            return res.status(404).json({ success: false, error: "Модель не найдена" });
        }

        res.json({
            success: true,
            data: {
                id: model.id,
                name: model.name,
                category_name: model.category?.name || "Неизвестно",
            },
        });
    } catch (err) {
        console.error("Ошибка при получении модели:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

// Обновить данные модели
router.patch("/admin/models/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;
        const { name, category_id } = req.body;

        const model = await Model.findByPk(modelId);
        if (!model) {
            return res.status(404).json({ success: false, error: "Модель не найдена" });
        }

        model.name = name ?? model.name;
        model.category_id = category_id ?? model.category_id;

        await model.save();
        res.json({ success: true, data: model });
    } catch (err) {
        console.error("Ошибка при обновлении модели:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

module.exports = router;
