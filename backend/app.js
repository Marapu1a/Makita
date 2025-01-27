const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./db'); // Подключаем базу данных
const modelRoutes = require('./routes/models'); // Роуты для моделей
const partRoutes = require('./routes/parts'); // Роуты для деталей
const slidesRoutes = require("./routes/slides"); // Роуты для слайдов

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Роуты
app.use('/api/models', modelRoutes); // Подключаем маршруты для моделей
app.use('/api/parts', partRoutes);  // Подключаем маршруты для деталей
app.use("/api/slides", slidesRoutes); // Подключаем маршруты для слайдов

// Точка проверки
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('Database connected!');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});

module.exports = app;
