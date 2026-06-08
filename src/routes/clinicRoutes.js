const express = require("express");
const router = express.Router();
const {
  registerClinic,
  verifyOtp,
  loginClinic,
  deleteClinic,
  setupProfile,
  getDashboardMetrics,
} = require("../controllers/clinicController");
const { protectClinic } = require("../middlewares/authMiddleware");
const {
  otpRegistrationLimiter,
  otpVerificationLimiter,
  authLimiter,
} = require("../middlewares/rateLimiter");

router.post("/register", otpRegistrationLimiter, registerClinic);
router.post("/verify-otp", otpVerificationLimiter, verifyOtp);
router.post("/login", authLimiter, loginClinic);
router.delete("/", deleteClinic);
router.put("/setup-profile", protectClinic, setupProfile);
router.get("/dashboard-metrics", protectClinic, getDashboardMetrics);

module.exports = router;
