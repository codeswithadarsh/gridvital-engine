const express = require("express");
const router = express.Router();
const { qrRegister, getCurrentToken } = require("../controllers/patientController");

router.post("/qr-register", qrRegister);
router.post("/current-token", getCurrentToken);

module.exports = router;
