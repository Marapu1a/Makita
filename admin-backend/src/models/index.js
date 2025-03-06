const sequelize = require("../config/database");
const { Categories, Model, Part, Slide } = require('./models');

const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("Подключение к БД успешно!");
        await sequelize.sync();
    } catch (error) {
        console.error("Ошибка подключения к БД:", error);
    }
};

module.exports = { sequelize, syncDB, Categories, Model, Part, Slide };
