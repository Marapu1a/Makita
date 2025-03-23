const express = require("express");
const { Categories } = require("../models");
const router = express.Router();

// Получить дерево категорий
router.get("/admin/categories", async (req, res) => {
    try {
        const parentId = req.query.parent_id || null;

        const whereClause = parentId
            ? { parent_id: parentId }
            : { parent_id: null };

        const categories = await Categories.findAll({
            where: whereClause,
            raw: true,
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error("Ошибка при получении категорий:", error);
        res.status(500).json({ success: false, error: "Ошибка при получении категорий" });
    }
});

// Обновить категорию
router.patch("/admin/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parent_id } = req.body;

        const category = await Categories.findByPk(id);
        if (!category) {
            return res.status(404).json({ success: false, error: "Категория не найдена" });
        }

        category.name = name ?? category.name;
        category.parent_id = parent_id ?? category.parent_id;

        await category.save();
        res.json({ success: true, data: category });
    } catch (error) {
        console.error("Ошибка при обновлении категории:", error);
        res.status(500).json({ success: false, error: "Ошибка при обновлении категории" });
    }
});

module.exports = router;
