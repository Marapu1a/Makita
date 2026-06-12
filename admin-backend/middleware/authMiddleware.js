const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    // Принимаем токен из Authorization header или из httpOnly cookie
    const headerToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) return res.status(401).json({ message: "Нет доступа" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Неверный токен" });
    }
};
