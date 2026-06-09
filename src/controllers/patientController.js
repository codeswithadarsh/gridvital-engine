const Patient = require("../models/Patient");
const Token = require("../models/Token");
const Clinic = require("../models/Clinic");
const asyncHandler = require("../utils/asyncHandler");

const qrRegister = asyncHandler(async (req, res) => {
  const { clinicDisplayId, name, phone, email, gender, age, chiefComplaints, isConsent } =
    req.body;

  if (!isConsent) {
    res.status(400);
    throw new Error("Accept terms to proceed");
  }

  if (!clinicDisplayId || !name || !phone || !gender || age === undefined) {
    res.status(400);
    throw new Error(
      "clinicDisplayId, name, phone, gender, and age are required"
    );
  }

  const clinic = await Clinic.findOne({ clinicDisplayId });
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  const clinicId = clinic._id;

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const existingPatient = await Patient.findOne({ phone, clinicId });
  if (existingPatient) {
    const duplicateToken = await Token.findOne({
      clinicId,
      patientId: existingPatient._id,
      visitDate: { $gte: startOfDay },
    });
    if (duplicateToken) {
      res.status(409);
      throw new Error("This phone number has already been registered today");
    }
  }

  const patient = await Patient.create({
    name,
    phone,
    email,
    gender,
    age,
    clinicId,
  });

  const lastToken = await Token.findOne({
    clinicId,
    visitDate: { $gte: startOfDay },
  }).sort({ tokenNumber: -1 });

  const tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

  const visit = await Token.create({
    tokenNumber,
    clinicId,
    patientId: patient._id,
    chiefComplaints: chiefComplaints || "",
    status: "Waiting",
    consultationFeeCharged: clinic.defaultConsultationFee || 0,
    isConsent,
  });

  res.status(201).json({
    success: true,
    message: "Patient registered successfully",
    data: {
      tokenNumber: visit.tokenNumber,
      status: visit.status,
      consultationFeeCharged: visit.consultationFeeCharged,
      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        gender: patient.gender,
        age: patient.age,
      },
    },
  });
});

module.exports = { qrRegister };
