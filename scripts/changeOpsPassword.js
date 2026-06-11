const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Clinic = require("../src/models/Clinic");

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log("Usage: node scripts/changeOpsPassword.js <email> <newPassword>");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const ops = await Clinic.findOne({ email, role: { $in: ["GRID_OPS", "GRID_RM"] } });
    if (!ops) {
      console.log("No OPS/RM account found with that email");
      process.exit(1);
    }

    ops.password = newPassword;
    await ops.save();

    console.log(`Password updated successfully for ${email}`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
