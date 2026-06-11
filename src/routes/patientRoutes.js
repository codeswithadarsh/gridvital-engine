const express = require("express");
const router = express.Router();
const { qrRegister, getCurrentToken } = require("../controllers/patientController");
const { checkSubscriptionStatus } = require("../middlewares/subscriptionMiddleware");

router.post("/qr-register", checkSubscriptionStatus, qrRegister);
router.post("/current-token", getCurrentToken);

module.exports = router;
