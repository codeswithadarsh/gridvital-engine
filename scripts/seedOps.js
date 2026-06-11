const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Clinic = require("../src/models/Clinic");

const email = process.argv[2] || "ops@gridvital.in";
const password = process.argv[3] || "admin123";
const name = process.argv[4] || "Super Admin";

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existing = await Clinic.findOne({ email });
    if (existing) {
      console.log(`GRID_OPS account already exists: ${email}`);
      process.exit(0);
    }

    await Clinic.create({
      email,
      password,
      doctorName: name,
      role: "GRID_OPS",
      isEmailVerified: true,
    });

    console.log(`GRID_OPS account created — email: ${email}, password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
