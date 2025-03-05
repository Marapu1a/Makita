const express = require("express");
const { getParts, updatePart } = require("../controllers/partController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", authMiddleware, getParts);
router.patch("/:id", authMiddleware, updatePart);

module.exports = router;
