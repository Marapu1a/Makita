require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { syncDB } = require("./models");
const authRoutes = require("./routes/authRoutes");
const partRoutes = require("./routes/partRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/parts", partRoutes);

const PORT = process.env.PORT || 5001;
syncDB().then(() => {
    app.listen(PORT, () => console.log(`Admin backend запущен на порту ${PORT}`));
});
