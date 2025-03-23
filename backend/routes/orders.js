const express = require("express");
const { Order, OrderItem } = require("../models");
const router = express.Router();

// POST /orders — оформить заказ
router.post("/", async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            delivery_method,
            transport_company,
            city,
            street,
            house,
            apartment,
            comment,
            total_price,
            cart
        } = req.body;

        if (!cart || cart.length === 0) {
            return res.status(400).json({ success: false, message: "Корзина пуста" });
        }

        // Создаём заказ
        const newOrder = await Order.create({
            name,
            phone,
            email,
            delivery_method,
            transport_company,
            city,
            street,
            house,
            apartment,
            comment,
            total_price,
            status: "Новый"
        });

        // Добавляем товары в заказ
        const orderItems = cart.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
        }));
        await OrderItem.bulkCreate(orderItems);

        res.status(201).json({ success: true, orderId: newOrder.id });
    } catch (error) {
        console.error("Ошибка при создании заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

module.exports = router;
