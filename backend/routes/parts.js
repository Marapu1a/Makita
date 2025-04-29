const express = require("express");
const { Part } = require("../models");
const router = express.Router();

// Получить все детали (по модели)
router.get("/model/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;
        const parts = await Part.findAll({ where: { model_id: modelId } });
        res.json({ success: true, data: parts });
    } catch (err) {
        console.error("Ошибка при получении деталей:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

module.exports = router;
