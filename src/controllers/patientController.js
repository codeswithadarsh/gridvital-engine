const Patient = require("../models/Patient");
const Token = require("../models/Token");
const Clinic = require("../models/Clinic");
const asyncHandler = require("../utils/asyncHandler");

const qrRegister = asyncHandler(async (req, res) => {
  const { clinicDisplayId, name, phone, email, gender, age, chiefComplaints } =
    req.body;

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

  let patient = await Patient.findOne({ phone, clinicId });

  if (!patient) {
    patient = await Patient.create({
      name,
      phone,
      email,
      gender,
      age,
      clinicId,
    });
  }

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

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
    consultationFeeCharged: clinic.defaultConsultationFee,
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
