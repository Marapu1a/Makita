const express = require('express');
const router = express.Router();
const { Slide, Part } = require('../models');

router.get('/model/:modelId', async (req, res) => {
    const { modelId } = req.params;
    try {
        const slides = await Slide.findAll({
            where: { model_id: modelId },
            attributes: ['slide_number', 'image_path', 'image_width', 'image_height'],
            order: [['slide_number', 'ASC']],
            include: [
                {
                    model: Part,
                    attributes: [
                        'id',
                        'number',
                        'part_number',
                        'name',
                        'price',
                        'quantity',
                        'x_coord',
                        'y_coord',
                        'width',
                        'height',
                    ],
                },
            ],
        });

        if (!slides || slides.length === 0) {
            return res.status(404).json({ message: 'Слайды не найдены' });
        }

        res.json(slides);
    } catch (error) {
        console.error('Ошибка получения слайдов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;
