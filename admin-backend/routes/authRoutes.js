const express = require("express");
const { login } = require("../controllers/authController");
const router = express.Router();

router.post("/admin/login", login);

module.exports = router;
