const express = require("express");
const { Model, Categories } = require("../models");
const router = express.Router();

router.get("/", async (req, res) => {
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

// Получение одной модели по `modelId`
router.get("/:modelId", async (req, res) => {
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

module.exports = router;