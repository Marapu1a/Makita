require("dotenv").config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db'); // Подключаем базу данных

// Роуты
const cookieParser = require("cookie-parser");
const modelRoutes = require('./routes/adminModelsRoutes'); // Модели
const partRoutes = require('./routes/adminPartsRoutes'); // Детали
const categoryRoutes = require('./routes/adminCategoriesRoutes'); // Категории
const ordersRoutes = require('./routes/adminOrdersRoutes'); // Заказы
const authRoutes = require('./routes/authRoutes'); // Авторизация

const app = express();
const PORT = 5001; // Админка должна работать на другом порту

// Middleware
const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:5174",
    credentials: true, // Разрешаем куки
};

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Роуты
app.use('/api', authRoutes);
app.use('/api', modelRoutes);
app.use('/api', partRoutes);
app.use('/api', categoryRoutes);
app.use('/api', ordersRoutes);

// Точка проверки
app.get('/', (req, res) => {
    res.send('Сервер админки работает!');
});

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`Сервер админки работает на http://localhost:${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('База данных подключена!');
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error);
    }
});

module.exports = app;
