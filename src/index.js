const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");


dotenv.config();
connectDB();

const app = express();

// MiddleWares
app.use(cors());
app.use(express.json());



// Test route
app.get("/", (req, res) => {
    res.send("GridVital Backend Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`server is running in ${PORT}`);
})