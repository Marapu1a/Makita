const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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

module.exports = Part;