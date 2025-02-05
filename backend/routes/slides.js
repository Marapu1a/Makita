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

// **Добавляем POST для создания слайда**
router.post('/', async (req, res) => {
    try {
        const { model_id, slide_number, image_path, image_width, image_height } = req.body;
        if (!model_id || !slide_number || !image_path) {
            return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
        }

        const slide = await Slide.create({ model_id, slide_number, image_path, image_width, image_height });
        res.status(201).json(slide);
    } catch (error) {
        console.error('Ошибка при добавлении слайда:', error);
        res.status(500).json({ error: 'Ошибка при добавлении слайда' });
    }
});

// **Добавляем POST для создания слайда**
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await Slide.destroy({ where: { id } });

        if (deleted) {
            res.json({ message: `Слайд ${id} удалён` });
        } else {
            res.status(404).json({ message: `Слайд ${id} не найден` });
        }
    } catch (error) {
        console.error('Ошибка при удалении слайда:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;
