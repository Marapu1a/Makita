const express = require("express");
const { Part } = require("../models");
const router = express.Router();

// Получить все детали по модели
router.get("/admin/parts/model/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;
        const parts = await Part.findAll({ where: { model_id: modelId } });
        res.json({ success: true, data: parts });
    } catch (err) {
        console.error("Ошибка при получении деталей:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

// Обновить деталь
router.patch("/admin/parts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { part_number, name, price, availability } = req.body;

        const part = await Part.findByPk(id);
        if (!part) {
            return res.status(404).json({ success: false, error: "Деталь не найдена" });
        }

        if (part_number !== undefined) part.part_number = part_number;
        if (name !== undefined) part.name = name;
        if (price !== undefined) part.price = price;
        if (availability !== undefined) part.availability = availability;


        await part.save();
        res.json({ success: true, data: part });
    } catch (err) {
        console.error("Ошибка при обновлении детали:", err);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

module.exports = router;
