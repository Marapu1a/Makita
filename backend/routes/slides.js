const express = require("express");
const { Slide, Part } = require("../models");
const router = express.Router();

// Получить слайды + детали
router.get("/model/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;
        const slides = await Slide.findAll({
            where: { model_id: modelId },
            attributes: ["slide_number", "image_path", "image_width", "image_height"],
            order: [["slide_number", "ASC"]],
            include: [
                {
                    model: Part,
                    attributes: [
                        "id",
                        "number",
                        "part_number",
                        "name",
                        "price",
                        "quantity",
                        "x_coord",
                        "y_coord",
                        "width",
                        "height",
                    ],
                },
            ],
        });

        res.json({ success: true, data: slides });
    } catch (error) {
        console.error("Ошибка получения слайдов:", error);
        res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
});

module.exports = router;
