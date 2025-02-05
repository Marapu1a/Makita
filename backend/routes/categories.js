const express = require("express");
const { Categories } = require("../models");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const categories = await Categories.findAll({ raw: true });

        // Создаем мапу, где ключ — id, значение — категория
        const categoryMap = new Map();
        const topCategories = [];

        categories.forEach((category) => {
            category.children = [];
            categoryMap.set(category.id, category);
        });

        categories.forEach((category) => {
            if (category.parent_id && categoryMap.has(category.parent_id)) {
                // Добавляем в `children` родительской категории
                categoryMap.get(category.parent_id).children.push(category);
            } else {
                // Если `parent_id` нет, это верхний уровень
                topCategories.push(category);
            }
        });

        console.log("Категории после распределения:", JSON.stringify(topCategories, null, 2));
        res.json(topCategories);
    } catch (error) {
        console.error("Ошибка при получении категорий:", error);
        res.status(500).json({ error: "Ошибка при получении категорий" });
    }
});

module.exports = router;
