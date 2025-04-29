const { Sequelize } = require('sequelize');

// Настройка подключения
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Успешное подключение к БД');
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error);
    }
}

// Запуск теста подключения только если файл выполняется напрямую
if (require.main === module) {
    testConnection();
}

module.exports = sequelize;
