const { Sequelize } = require('sequelize');

// Настройка подключения
const sequelize = new Sequelize('makita', 'postgres', '2831742dfcz', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false,
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Успешное подключение к БД');
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error);
    }
}

testConnection();

module.exports = sequelize;
