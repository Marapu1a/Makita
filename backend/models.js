const { DataTypes } = require('sequelize');
const sequelize = require('./db');

// Модель Model
const Model = sequelize.define('Model', {
    name: { type: DataTypes.STRING, allowNull: false },
    image_path: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'models',
    createdAt: 'createdat', // Указываем точное имя столбца
    updatedAt: 'updatedat',
});

// Модель Part
const Part = sequelize.define('Part', {
    model_id: { type: DataTypes.INTEGER, allowNull: false }, // связь с моделью
    number: { type: DataTypes.INTEGER, allowNull: false }, // Номер детали на схеме
    name: { type: DataTypes.STRING, allowNull: true }, // Наименование может быть пустым
    part_number: { type: DataTypes.STRING, allowNull: false, unique: true }, // Уникальный артикул
    x_coord: { type: DataTypes.FLOAT }, // Координаты на схеме (опционально)
    y_coord: { type: DataTypes.FLOAT },
    price: { type: DataTypes.FLOAT, defaultValue: 0 }, // Цена, по умолчанию 0
    availability: { type: DataTypes.BOOLEAN, defaultValue: true }, // Доступность
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 }, // Количество
    width: { type: DataTypes.FLOAT, allowNull: true }, // Ширина детали
    height: { type: DataTypes.FLOAT, allowNull: true }, // Высота детали
}, {
    tableName: 'parts', // Явно задаём имя таблицы
    createdAt: 'createdat', // Указываем точное имя столбца
    updatedAt: 'updatedat',
});

// Связь между таблицами
Model.hasMany(Part, { foreignKey: 'model_id' });
Part.belongsTo(Model, { foreignKey: 'model_id' });

module.exports = { Model, Part };
