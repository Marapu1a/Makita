const express = require("express");
const { Categories } = require("../models");
const router = express.Router();

// Получить дерево категорий
router.get("/", async (req, res) => {
    try {
        const categories = await Categories.findAll({ raw: true });

        // Создаём мапу для удобства формирования дерева
        const categoryMap = new Map();
        const topCategories = [];

        categories.forEach((category) => {
            category.children = [];
            categoryMap.set(category.id, category);
        });

        categories.forEach((category) => {
            if (category.parent_id && categoryMap.has(category.parent_id)) {
                categoryMap.get(category.parent_id).children.push(category);
            } else {
                topCategories.push(category);
            }
        });

        res.json({ success: true, data: topCategories });
    } catch (error) {
        console.error("Ошибка при получении категорий:", error);
        res.status(500).json({ success: false, error: "Ошибка при получении категорий" });
    }
});

module.exports = router;
