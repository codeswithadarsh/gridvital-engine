const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: Number, required: true },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    chiefComplaints: { type: String },
    status: {
      type: String,
      enum: ["Waiting", "In-Consultation", "Completed", "Cancelled"],
      default: "Waiting",
    },
    visitDate: { type: Date, default: Date.now },
    consultationFeeCharged: { type: Number, required: true },
  },
  { timestamps: true }
);

tokenSchema.index({ clinicId: 1, visitDate: -1 });

module.exports = mongoose.model("Token", tokenSchema);
