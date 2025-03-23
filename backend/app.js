const express = require('express');
const cors = require('cors');
const sequelize = require('./db'); // Подключаем базу данных
const modelRoutes = require('./routes/models'); // Роуты для моделей
const partRoutes = require('./routes/parts'); // Роуты для деталей
const slidesRoutes = require('./routes/slides'); // Роуты для слайдов
const categoryRoutes = require('./routes/categories'); // Импортируем маршруты категорий
const ordersRoutes = require('./routes/orders'); // Импортируем заказы

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Роуты
app.use('/api/models', modelRoutes); // Подключаем маршруты для моделей
app.use('/api/parts', partRoutes);  // Подключаем маршруты для деталей
app.use('/api/slides', slidesRoutes); // Подключаем маршруты для слайдов
app.use('/api/categories', categoryRoutes); // Подключаем маршруты категорий
app.use('/api/orders', ordersRoutes); // Подключаем маршруты заказов

// Точка проверки
app.get('/', (req, res) => {
    res.send('Сервер работает!');
});

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`Сервер работает на http://localhost:${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('База данных подключена!');
    } catch (error) {
        console.error('Не выходит подключиться к базе данных:', error);
    }
});

module.exports = app;
