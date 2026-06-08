const express = require("express");
const router = express.Router();
const { qrRegister } = require("../controllers/patientController");

router.post("/qr-register", qrRegister);

module.exports = router;
