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
  getTodayPatients,
  getTodayPatientDetails,
  addPrescription,
  getPatientAllDetails,
  getPatientHistory,
  getClinicProfile,
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
router.get("/today-patients", protectClinic, getTodayPatients);
router.post("/today-patients-details", protectClinic, getTodayPatientDetails);
router.post("/add-prescription", protectClinic, addPrescription);
router.post("/patient-all-details", protectClinic, getPatientAllDetails);
router.post("/patient-history", protectClinic, getPatientHistory);
router.get("/profile", protectClinic, getClinicProfile);
router.post("/call-next", protectClinic, callNextPatient);
router.get("/consultation-status", protectClinic, getConsultationStatus);

module.exports = router;
