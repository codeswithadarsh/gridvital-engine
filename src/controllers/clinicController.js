const crypto = require("crypto");
const Clinic = require("../models/Clinic");
const Patient = require("../models/Patient");
const Token = require("../models/Token");
const { generateToken } = require("../utils/tokenUtils");
const sendEmail = require("../utils/sendEmail");
const verifyEmailOTPTemplate = require("../utils/emailTemplates/sendVerifyEmailOTP");
const asyncHandler = require("../utils/asyncHandler");

const getPastPrescriptions = async (currentToken, clinicId) => {
  const currentName = currentToken.patientId.name;
  const currentPhone = currentToken.patientId.phone;
  const currentTokenId = currentToken._id;

  const nameWords = currentName.split(/\s+/).filter(Boolean);
  const escapedWords = nameWords.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const nameConditions = escapedWords.map((word) => ({
    name: { $regex: word, $options: "i" },
  }));

  const relatedPatients = await Patient.find({
    clinicId,
    phone: currentPhone,
    $or: nameConditions,
  }).select("_id");

  const relatedPatientIds = relatedPatients.map((p) => p._id);

  const pastTokens = await Token.find({
    patientId: { $in: relatedPatientIds },
    clinicId,
    prescription: { $exists: true, $ne: "" },
    _id: { $ne: currentTokenId },
  })
    .sort({ visitDate: -1 })
    .select("prescription visitDate");

  return pastTokens.map((t) => ({
    prescription: t.prescription,
    date: t.visitDate,
  }));
};

const registerClinic = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const existingClinic = await Clinic.findOne({ email });
  if (existingClinic) {
    res.status(409);
    throw new Error("A clinic with this email already exists");
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Clinic.create({
    email,
    password,
    otp,
    otpExpiresAt,
  });

  try {
    await sendEmail({
      to: email,
      subject: "GridVital - Email Verification OTP",
      html: verifyEmailOTPTemplate(otp),
    });
  } catch (emailError) {
    console.log(`[DEV FALLBACK] OTP for ${email}: ${otp}`);
  }

  res.status(201).json({
    success: true,
    message: "Clinic registered. OTP sent to email.",
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  const clinic = await Clinic.findOne({ email }).select("+password");
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  if (clinic.isEmailVerified) {
    res.status(400);
    throw new Error("Email already verified");
  }

  if (clinic.otp !== otp || clinic.otpExpiresAt < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  if (!clinic.clinicDisplayId) {
    const lastClinic = await Clinic.findOne({}, { clinicDisplayId: 1 }).sort({
      clinicDisplayId: -1,
    });

    let nextSeq = 1;
    if (lastClinic && lastClinic.clinicDisplayId) {
      nextSeq = parseInt(lastClinic.clinicDisplayId.replace("GV-", ""), 10) + 1;
    }

    let isUnique = false;
    while (!isUnique) {
      clinic.clinicDisplayId = `GV-${String(nextSeq).padStart(4, "0")}`;
      const exists = await Clinic.findOne({
        clinicDisplayId: clinic.clinicDisplayId,
      });
      if (!exists) isUnique = true;
      else nextSeq++;
    }
  }

  clinic.isEmailVerified = true;
  clinic.otp = null;
  clinic.otpExpiresAt = null;
  await clinic.save();

  const token = generateToken(clinic._id);

  res.json({
    success: true,
    message: "Email verified successfully",
    token,
    clinic: {
      id: clinic._id,
      email: clinic.email,
      clinicDisplayId: clinic.clinicDisplayId,
    },
  });
});

const loginClinic = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const clinic = await Clinic.findOne({ email }).select("+password");
  if (!clinic) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await clinic.comparePassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = generateToken(clinic._id);

  res.json({
    success: true,
    token,
    clinic: {
      id: clinic._id,
      email: clinic.email,
      clinicDisplayId: clinic.clinicDisplayId,
    },
  });
});

const setupProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "clinicName",
    "doctorName",
    "specialization",
    "gender",
    "phone",
    "registrationNumber",
    "address",
    "state",
    "city",
    "defaultConsultationFee",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update");
  }

  const clinic = await Clinic.findByIdAndUpdate(req.clinicId, updates, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    clinic: {
      id: clinic._id,
      clinicDisplayId: clinic.clinicDisplayId,
      email: clinic.email,
      clinicName: clinic.clinicName,
      doctorName: clinic.doctorName,
      isEmailVerified: clinic.isEmailVerified,
    },
  });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const clinic = await Clinic.findOneAndDelete({ email });
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  res.json({
    success: true,
    message: `Clinic with email ${email} deleted successfully`,
  });
});

const sendResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const clinic = await Clinic.findOne({ email });
  if (!clinic) {
    res.status(404);
    throw new Error("No clinic found with this email");
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  clinic.otp = otp;
  clinic.otpExpiresAt = otpExpiresAt;
  await clinic.save();

  try {
    await sendEmail({
      to: email,
      subject: "GridVital - Password Reset OTP",
      html: verifyEmailOTPTemplate(otp),
    });
  } catch (emailError) {
    console.log(`[DEV FALLBACK] Password reset OTP for ${email}: ${otp}`);
  }

  res.json({
    success: true,
    message: "OTP sent to email for password reset",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    res.status(400);
    throw new Error("Email, OTP, and new password are required");
  }

  const clinic = await Clinic.findOne({ email }).select("+password");
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  if (clinic.otp !== otp || clinic.otpExpiresAt < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  clinic.password = password;
  clinic.otp = null;
  clinic.otpExpiresAt = null;
  await clinic.save();

  res.json({
    success: true,
    message: "Password reset successful",
  });
});

const getAllClinics = asyncHandler(async (req, res) => {
  const clinics = await Clinic.find(
    {},
    "email clinicDisplayId clinicName doctorName city state",
  ).sort({ clinicDisplayId: 1 });

  res.json({
    success: true,
    count: clinics.length,
    data: clinics,
  });
});

const getDashboardMetrics = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    clinic,
    tokens,
    totalPatientsToday,
    todayRevenueResult,
    monthlyTotalPatients,
  ] = await Promise.all([
    Clinic.findById(clinicId).select("clinicDisplayId"),

    Token.find({ clinicId, visitDate: { $gte: startOfDay } })
      .sort({ tokenNumber: 1 }),

    Token.countDocuments({ clinicId, visitDate: { $gte: startOfDay } }),

    Token.aggregate([
      {
        $match: {
          clinicId,
          visitDate: { $gte: startOfDay },
          status: { $ne: "Cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$consultationFeeCharged" } } },
    ]),

    Token.countDocuments({ clinicId, visitDate: { $gte: startOfMonth } }),
  ]);

  const activeToken = tokens.find(
    (t) => t.status === "Waiting" || t.status === "In-Consultation",
  );

  const liveTokenCounter = activeToken ? `#${activeToken.tokenNumber}` : 0;

  const todayRevenue =
    "₹" + (todayRevenueResult[0]?.total || 0).toLocaleString("en-IN");

  res.json({
    success: true,
    data: {
      liveTokenCounter,
      totalPatientsToday,
      monthlyTotalPatients,
      todayRevenue,
      clinicDisplayId: clinic?.clinicDisplayId || null,
    },
  });
});

const getTodayPatients = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tokens = await Token.find({ clinicId, visitDate: { $gte: startOfDay } })
    .sort({ tokenNumber: 1 })
    .populate("patientId", "name phone");

  const patients = tokens.map((t) => ({
    id: t._id,
    token: `#${t.tokenNumber}`,
    name: t.patientId?.name || null,
    phone: t.patientId?.phone || null,
    complaints: t.chiefComplaints || null,
    status: t.status,
  }));

  res.json({ success: true, data: patients });
});

const getTodayPatientDetails = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;
  const { tokenId } = req.body;

  if (!tokenId) {
    res.status(400);
    throw new Error("tokenId is required");
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const token = await Token.findOne({
    _id: tokenId,
    clinicId,
    visitDate: { $gte: startOfDay },
  }).populate("patientId", "name age gender email");

  if (!token) {
    res.status(404);
    throw new Error("Token not found for today");
  }

  const pastPrescriptions = await getPastPrescriptions(token, clinicId);

  res.json({
    success: true,
    data: {
      patientId: token.patientId._id,
      name: token.patientId.name,
      age: token.patientId.age,
      gender: token.patientId.gender,
      email: token.patientId.email,
      tokenNumber: token.tokenNumber,
      status: token.status,
      visitDate: token.visitDate,
      isConsent: token.isConsent,
      chiefComplaints: token.chiefComplaints || null,
      pastPrescriptions,
    },
  });
});

const addPrescription = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;
  const { tokenId, prescription, fees } = req.body;

  if (!tokenId) {
    res.status(400);
    throw new Error("tokenId is required");
  }

  const token = await Token.findOne({
    _id: tokenId,
    clinicId,
    status: "In-Consultation",
  });

  if (!token) {
    res.status(404);
    throw new Error("No In-Consultation token found");
  }

  if (prescription !== undefined) token.prescription = prescription;
  if (fees !== undefined) token.consultationFeeCharged = fees;

  await token.save();

  res.json({ success: true, message: "Saved successfully" });
});

const getPatientAllDetails = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;
  const { tokenId } = req.body;

  if (!tokenId) {
    res.status(400);
    throw new Error("tokenId is required");
  }

  const token = await Token.findOne({
    _id: tokenId,
    clinicId,
  }).populate("patientId", "name age gender email");

  if (!token) {
    res.status(404);
    throw new Error("Token not found");
  }

  const pastPrescriptions = await getPastPrescriptions(token, clinicId);

  res.json({
    success: true,
    data: {
      patientId: token.patientId._id,
      name: token.patientId.name,
      age: token.patientId.age,
      gender: token.patientId.gender,
      email: token.patientId.email,
      tokenNumber: token.tokenNumber,
      status: token.status,
      visitDate: token.visitDate,
      isConsent: token.isConsent,
      chiefComplaints: token.chiefComplaints || null,
      pastPrescriptions,
    },
  });
});

const getPatientHistory = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;
  const { name, phone, page = 1, pageSize = 20 } = req.body;

  const p = Math.max(1, parseInt(page) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

  const patientQuery = { clinicId };
  if (name || phone) {
    patientQuery.$or = [];
    if (name) patientQuery.$or.push({ name: { $regex: name, $options: "i" } });
    if (phone) patientQuery.$or.push({ phone: { $regex: phone, $options: "i" } });
  }

  const patients = await Patient.find(patientQuery).select("_id");
  const patientIds = patients.map((p) => p._id);

  if (patientIds.length === 0) {
    return res.json({ success: true, data: [], total: 0, page: p, pageSize: ps, totalPages: 0 });
  }

  const [tokens, total] = await Promise.all([
    Token.find({ clinicId, patientId: { $in: patientIds } })
      .sort({ visitDate: -1 })
      .skip((p - 1) * ps)
      .limit(ps)
      .populate("patientId", "name phone"),
    Token.countDocuments({ clinicId, patientId: { $in: patientIds } }),
  ]);

  const data = tokens.map((t) => ({
    tokenId: t._id,
    tokenNumber: t.tokenNumber,
    status: t.status,
    visitDate: t.visitDate,
    patient: {
      id: t.patientId._id,
      name: t.patientId.name,
      phone: t.patientId.phone,
    },
  }));

  res.json({
    success: true,
    data,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  });
});

const getClinicPublicProfile = asyncHandler(async (req, res) => {
  const { clinicDisplayId } = req.params;

  const clinic = await Clinic.findOne({ clinicDisplayId }).select(
    "clinicDisplayId clinicName doctorName specialization phone address city state defaultConsultationFee",
  );

  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  res.json({ success: true, data: clinic });
});

const callNextPatient = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;
  const currentPatientStatus = req.body.currentPatientStatus || "Completed";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activeToken = await Token.findOne({
    clinicId,
    visitDate: { $gte: startOfDay },
    status: "In-Consultation",
  });

  if (activeToken) {
    activeToken.status = currentPatientStatus;
    await activeToken.save();
  }

  const nextToken = await Token.findOne({
    clinicId,
    visitDate: { $gte: startOfDay },
    status: "Waiting",
  }).sort({ tokenNumber: 1 });

  if (nextToken) {
    nextToken.status = "In-Consultation";
    await nextToken.save();
  }

  const currentActiveToken = nextToken
    ? { tokenNumber: nextToken.tokenNumber, status: nextToken.status }
    : null;

  res.json({
    success: true,
    message: nextToken
      ? `Token #${nextToken.tokenNumber} called into cabin successfully`
      : "Queue is empty",
    currentActiveToken,
  });
});

const getConsultationStatus = asyncHandler(async (req, res) => {
  const clinicId = req.clinicId;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [current, next] = await Promise.all([
    Token.findOne({
      clinicId,
      visitDate: { $gte: startOfDay },
      status: "In-Consultation",
    }).populate("patientId", "name"),
    Token.findOne({
      clinicId,
      visitDate: { $gte: startOfDay },
      status: "Waiting",
    }).sort({ tokenNumber: 1 }).populate("patientId", "name"),
  ]);

  if (!current && !next) {
    res.status(200).json({
      success: false,
      message: "Queue is empty",
    });
    return;
  }

  res.json({
    success: true,
    data: {
      current: current
        ? { tokenId: current._id, tokenNumber: current.tokenNumber, patientName: current.patientId?.name }
        : null,
      next: next
        ? { tokenId: next._id, tokenNumber: next.tokenNumber, patientName: next.patientId?.name }
        : null,
    },
  });
});

module.exports = {
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
  getClinicPublicProfile,
  callNextPatient,
  getConsultationStatus,
};
