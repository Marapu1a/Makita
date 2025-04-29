const { DataTypes } = require('sequelize');
const sequelize = require('./db');

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

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    delivery_method: {
        type: DataTypes.ENUM('Самовывоз', 'Доставка', 'Отправка в регион'),
        allowNull: false
    },
    transport_company: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    street: { type: DataTypes.STRING, allowNull: true },
    house: { type: DataTypes.STRING, allowNull: true },
    apartment: { type: DataTypes.STRING, allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
    total_price: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    status: {
        type: DataTypes.ENUM('Новый', 'В обработке', 'Отправлен', 'Завершён', 'Отменён'),
        allowNull: false,
        defaultValue: 'Новый'
    },
}, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false }
}, {
    tableName: 'order_items',
    timestamps: false,
});

// 🔗 Ассоциации (унифицированные с `as`)
Order.hasMany(OrderItem, { foreignKey: 'order_id', onDelete: 'CASCADE', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Part, { foreignKey: 'product_id', as: 'part' });

Categories.hasMany(Model, { foreignKey: 'category_id', as: 'models' });
Model.belongsTo(Categories, { foreignKey: 'category_id', as: 'category' });

Categories.hasMany(Categories, { as: 'subcategories', foreignKey: 'parent_id' });
Categories.belongsTo(Categories, { as: 'parentCategory', foreignKey: 'parent_id' });

Model.hasMany(Part, { foreignKey: 'model_id', as: 'parts' });
Part.belongsTo(Model, { foreignKey: 'model_id', as: 'model' });

Model.hasMany(Slide, { foreignKey: 'model_id', as: 'slides' });
Slide.belongsTo(Model, { foreignKey: 'model_id', as: 'model' });

Slide.hasMany(Part, { foreignKey: 'slide_id', as: 'parts' });
Part.belongsTo(Slide, { foreignKey: 'slide_id', as: 'slide' });

// 🔃 Синхронизация
const reset = process.argv.includes('--reset');
sequelize.sync({ force: reset, alter: !reset })
    .then(() => {
        console.log(`🔥 Все таблицы ${reset ? "пересозданы" : "синхронизированы"}!`);
    })
    .catch(err => {
        console.error("❌ Ошибка при создании таблиц:", err);
    });

module.exports = {
    Categories,
    Model,
    Part,
    Slide,
    Order,
    OrderItem
};