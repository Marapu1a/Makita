const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Categories = sequelize.define('Categories', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

const Model = sequelize.define('Model', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    image_path: { type: DataTypes.STRING, allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'models',
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
});

const Part = sequelize.define('Part', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    model_id: { type: DataTypes.INTEGER, allowNull: false },
    slide_id: { type: DataTypes.INTEGER, allowNull: true },
    number: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    part_number: { type: DataTypes.STRING, allowNull: false },
    x_coord: { type: DataTypes.DOUBLE },
    y_coord: { type: DataTypes.DOUBLE },
    price: { type: DataTypes.DOUBLE, defaultValue: 0 },
    availability: { type: DataTypes.BOOLEAN, defaultValue: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    width: { type: DataTypes.DOUBLE, allowNull: true },
    height: { type: DataTypes.DOUBLE, allowNull: true },
}, {
    tableName: 'parts',
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    indexes: [
        {
            unique: true,
            fields: ['model_id', 'number']
        }
    ],
});

const Slide = sequelize.define('Slide', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    model_id: { type: DataTypes.INTEGER, allowNull: false },
    slide_number: { type: DataTypes.INTEGER, allowNull: false },
    image_path: { type: DataTypes.STRING, allowNull: false },
    image_width: { type: DataTypes.DOUBLE },
    image_height: { type: DataTypes.DOUBLE },
}, {
    tableName: 'slides',
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    indexes: [
        {
            unique: true,
            fields: ['model_id', 'slide_number']
        }
    ]
});

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

module.exports = { Categories, Model, Part, Slide };