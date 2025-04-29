const express = require("express");
const { Categories } = require("../models");
const router = express.Router();

// Получить дерево категорий
router.get("/", async (req, res) => {
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

module.exports = router;
