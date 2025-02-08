const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Categories = sequelize.define('Categories', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'categories',
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

// Модель Model
const Model = sequelize.define('Model', {
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    image_path: { type: DataTypes.STRING, allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'models',
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

// Модель Part
const Part = sequelize.define('Part', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    model_id: { type: DataTypes.INTEGER, allowNull: false },
    slide_id: { type: DataTypes.INTEGER, allowNull: true },
    number: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    part_number: { type: DataTypes.STRING, allowNull: false },
    x_coord: { type: DataTypes.FLOAT },
    y_coord: { type: DataTypes.FLOAT },
    price: { type: DataTypes.FLOAT, defaultValue: 0 },
    availability: { type: DataTypes.BOOLEAN, defaultValue: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    width: { type: DataTypes.FLOAT, allowNull: true },
    height: { type: DataTypes.FLOAT, allowNull: true },
}, {
    tableName: 'parts',
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    indexes: [
        {
            unique: true,
            fields: ['model_id', 'number']
        }
    ],
});

// Модель Slide
const Slide = sequelize.define('Slide', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    model_id: { type: DataTypes.INTEGER, allowNull: false },
    slide_number: { type: DataTypes.INTEGER, allowNull: false },
    image_path: { type: DataTypes.STRING, allowNull: false },
    image_width: { type: DataTypes.FLOAT },
    image_height: { type: DataTypes.FLOAT },
}, {
    tableName: 'slides',
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    indexes: [
        {
            unique: true,
            fields: ['model_id', 'slide_number']
        }
    ]
});

// Связи между таблицами
Categories.hasMany(Model, { foreignKey: 'category_id' });
Model.belongsTo(Categories, { foreignKey: 'category_id' });

Categories.hasMany(Categories, { as: "subcategories", foreignKey: "parent_id" });
Categories.belongsTo(Categories, { as: "parentCategory", foreignKey: "parent_id" });

Model.hasMany(Part, { foreignKey: 'model_id' });
Part.belongsTo(Model, { foreignKey: 'model_id' });

Model.hasMany(Slide, { foreignKey: 'model_id' });
Slide.belongsTo(Model, { foreignKey: 'model_id' });

Slide.hasMany(Part, { foreignKey: 'slide_id' });
Part.belongsTo(Slide, { foreignKey: 'slide_id' });

const reset = process.argv.includes('--reset'); // Запуск с аргументом --reset удалит всё
sequelize.sync({ force: reset, alter: !reset })
    .then(() => {
        console.log(`🔥 Все таблицы ${reset ? "пересозданы" : "синхронизированы"}!`);
    })
    .catch(err => {
        console.error("❌ Ошибка при создании таблиц:", err);
    });

module.exports = { Categories, Model, Part, Slide };
