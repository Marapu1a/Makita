const { Part } = require("../models");

const getParts = async (req, res) => {
    const parts = await Part.findAll();
    res.json(parts);
};

const updatePart = async (req, res) => {
    const { id } = req.params;
    const { name, price, available } = req.body;

    const part = await Part.findByPk(id);
    if (!part) return res.status(404).json({ message: "Деталь не найдена" });

    part.name = name ?? part.name;
    part.price = price ?? part.price;
    part.available = available ?? part.available;

    await part.save();
    res.json(part);
};

module.exports = { getParts, updatePart };
