const express = require("express");
const router = express.Router();
const {
  registerClinic,
  verifyOtp,
  loginClinic,
  deleteClinic,
  setupProfile,
  getAllClinics,
  sendResetOtp,
  resetPassword,
  getDashboardMetrics,
  getClinicPublicProfile,
  callNextPatient,
  getConsultationStatus,
} = require("../controllers/clinicController");
const { protectClinic } = require("../middlewares/authMiddleware");
const {
  otpRegistrationLimiter,
  otpVerificationLimiter,
  authLimiter,
} = require("../middlewares/rateLimiter");

router.get("/public/:clinicDisplayId", getClinicPublicProfile);
router.get("/", getAllClinics);
router.post("/register", otpRegistrationLimiter, registerClinic);
router.post("/verify-otp", otpVerificationLimiter, verifyOtp);
router.post("/login", authLimiter, loginClinic);
router.delete("/", deleteClinic);
router.put("/setup-profile", protectClinic, setupProfile);
router.post("/forgot-password", otpRegistrationLimiter, sendResetOtp);
router.post("/reset-password", otpVerificationLimiter, resetPassword);
router.get("/dashboard-metrics", protectClinic, getDashboardMetrics);
router.post("/call-next", protectClinic, callNextPatient);
router.get("/consultation-status", protectClinic, getConsultationStatus);

module.exports = router;
