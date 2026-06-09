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
      id: visit._id,
      tokenNumber: visit.tokenNumber,
      status: visit.status,
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

const getCurrentToken = asyncHandler(async (req, res) => {
  const { tokenId, clinicDisplayId } = req.body;

  if (!tokenId) {
    res.status(400);
    throw new Error("tokenId is required");
  }

  const token = await Token.findById(tokenId).populate("clinicId", "clinicName clinicDisplayId").populate("patientId", "name");

  if (!token) {
    res.status(404);
    throw new Error("Token not found");
  }

  if (clinicDisplayId && token.clinicId.clinicDisplayId !== clinicDisplayId) {
    res.status(400);
    throw new Error("Token does not belong to this clinic");
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const waitingTokens = await Token.find({
    clinicId: token.clinicId._id,
    visitDate: { $gte: startOfDay, $lt: endOfDay },
    status: "Waiting",
    tokenNumber: { $lt: token.tokenNumber },
  }).sort({ tokenNumber: 1 });

  const aheadTokens = waitingTokens.map((t) => t.tokenNumber);

  res.status(200).json({
    success: true,
    data: {
      tokenNumber: token.tokenNumber,
      status: token.status,
      queuePosition: aheadTokens.length,
      aheadTokens,
      clinicName: token.clinicId.clinicName,
      patientName: token.patientId.name,
    },
  });
});

module.exports = { qrRegister, getCurrentToken };
