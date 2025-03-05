const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const login = async (req, res) => {
    const { login, password } = req.body;

    if (login !== process.env.ADMIN_LOGIN)
        return res.status(401).json({ message: "Неверный логин" });

    const passwordMatch = await bcrypt.compare(password, await bcrypt.hash(process.env.ADMIN_PASSWORD, 10));
    if (!passwordMatch)
        return res.status(401).json({ message: "Неверный пароль" });

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.json({ token });
};

module.exports = { login };
