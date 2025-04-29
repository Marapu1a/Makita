const express = require("express");
const { Order, OrderItem, Model, Part, Categories } = require("../models");
const router = express.Router();
const { Op } = require("sequelize");

// Получить все заказы (с фильтрацией по статусу)
router.get("/admin/orders", async (req, res) => {
    try {
        const { status } = req.query;

        const whereClause = status ? { status } : {}; // Фильтр по статусу, если передан

        const orders = await Order.findAll({
            where: whereClause,
            include: [{ model: OrderItem, as: "items" }],
            order: [["created_at", "DESC"]],
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Ошибка при получении заказов:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

// Получить заказ по ID
router.get("/admin/orders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: "items",
                    include: [
                        {
                            model: Part,
                            as: "part",
                            include: [
                                {
                                    model: Model,
                                    as: "model",
                                    include: [
                                        {
                                            model: Categories,
                                            as: "category",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Заказ не найден" });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error("Ошибка при получении заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

// Обновить статус заказа
router.patch("/admin/orders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await Order.findByPk(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Заказ не найден" });
        }

        order.status = status ?? order.status;
        await order.save();

        res.json({ success: true, data: order });
    } catch (error) {
        console.error("Ошибка при обновлении заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

module.exports = router;
