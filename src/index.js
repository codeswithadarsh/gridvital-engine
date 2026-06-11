const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const clinicRoutes = require("./routes/clinicRoutes");
const patientRoutes = require("./routes/patientRoutes");
const opsRoutes = require("./routes/opsRoutes");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GridVital Backend Running");
});

app.use("/api/clinic", clinicRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/ops", opsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
