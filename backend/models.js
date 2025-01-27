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
    part_number: { type: DataTypes.STRING, allowNull: false }, // Артикул
    x_coord: { type: DataTypes.FLOAT }, // Координаты на схеме
    y_coord: { type: DataTypes.FLOAT },
    price: { type: DataTypes.FLOAT, defaultValue: 0 }, // Цена
    availability: { type: DataTypes.BOOLEAN, defaultValue: true }, // Доступность
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 }, // Количество
    width: { type: DataTypes.FLOAT, allowNull: true }, // Ширина детали
    height: { type: DataTypes.FLOAT, allowNull: true }, // Высота детали
    slide_number: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'parts', // Имя таблицы
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

// Модель Slide
const Slide = sequelize.define('Slide', {
    model_id: { type: DataTypes.INTEGER, allowNull: false }, // связь с моделью
    slide_number: { type: DataTypes.INTEGER, allowNull: false }, // Номер слайда
    image_path: { type: DataTypes.STRING, allowNull: false }, // Путь к изображению
    image_width: { type: DataTypes.FLOAT }, // Ширина изображения
    image_height: { type: DataTypes.FLOAT }, // Высота изображения
}, {
    tableName: 'slides', // Имя таблицы
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

// Связи между таблицами
Model.hasMany(Part, { foreignKey: 'model_id' });
Part.belongsTo(Model, { foreignKey: 'model_id' });

Model.hasMany(Slide, { foreignKey: 'model_id' });
Slide.belongsTo(Model, { foreignKey: 'model_id' });

// Добавляем связь между Slide и Part
Slide.hasMany(Part, { foreignKey: 'slide_number', sourceKey: 'slide_number' });
Part.belongsTo(Slide, { foreignKey: 'slide_number', targetKey: 'slide_number' });

module.exports = { Model, Part, Slide };
