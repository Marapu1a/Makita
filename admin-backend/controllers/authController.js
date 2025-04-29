const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    console.log("Полученные данные:", req.body);
    console.log("Ожидаемый логин:", process.env.ADMIN_LOGIN);
    console.log("Ожидаемый пароль:", process.env.ADMIN_PASSWORD);

    const { login, password } = req.body;

    if (login !== process.env.ADMIN_LOGIN) {
        console.log("Ошибка: неверный логин");
        return res.status(401).json({ message: "Неверный логин" });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        console.log("Ошибка: неверный пароль");
        return res.status(401).json({ message: "Неверный пароль" });
    }

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.cookie("token", token, {
        httpOnly: true,  // Недоступно для JavaScript
        secure: process.env.NODE_ENV === "production", // Только по HTTPS в проде
        sameSite: "Strict", // Защита от CSRF
        maxAge: 24 * 60 * 60 * 1000, // 1 день
    });

    res.json({ success: true, token });
};


module.exports = { login };
