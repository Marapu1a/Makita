const { Sequelize } = require('sequelize');

// Настройка подключения
const sequelize = new Sequelize('makita', 'postgres', '2831742dfcz', {
    host: 'localhost',
    dialect: 'postgres',
});

// Проверка соединения
sequelize.authenticate()
    .then(() => console.log('Database connected!'))
    .catch(err => console.error('Error connecting to database:', err));

module.exports = sequelize;
