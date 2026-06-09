const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const clinicSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    isEmailVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    doctorName: { type: String, default: null },
    specialization: { type: String, default: null },
    clinicName: { type: String, default: null },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: null },
    phone: { type: String, default: null },
    registrationNumber: { type: String, default: null },
    address: { type: String, default: null },
    state: { type: String, default: null },
    city: { type: String, default: null },
    defaultConsultationFee: { type: Number },
    clinicDisplayId: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

clinicSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

clinicSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Clinic", clinicSchema);
