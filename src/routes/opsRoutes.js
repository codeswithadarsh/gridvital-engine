const express = require("express");
const router = express.Router();
const { protectOps } = require("../middlewares/authMiddleware");
const {
  opsLogin,
  registerOps,
  registerRm,
  listClinics,
  clinicDetails,
  manageSubscription,
  deleteClinic,
} = require("../controllers/opsController");

router.post("/login", opsLogin);
router.post("/register-ops", protectOps, registerOps);
router.post("/register-rm", protectOps, registerRm);
router.post("/clinics-list", protectOps, listClinics);
router.post("/clinic-details", protectOps, clinicDetails);
router.post("/manage-subscription", protectOps, manageSubscription);
router.post("/delete-clinic", protectOps, deleteClinic);

module.exports = router;
