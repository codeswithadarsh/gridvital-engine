const crypto = require("crypto");
const Clinic = require("../models/Clinic");
const Token = require("../models/Token");
const { generateToken } = require("../utils/tokenUtils");
const sendEmail = require("../utils/sendEmail");
const verifyEmailOTPTemplate = require("../utils/emailTemplates/sendVerifyEmailOTP");
const asyncHandler = require("../utils/asyncHandler");

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
      .sort({ tokenNumber: 1 })
      .populate("patientId", "name phone"),

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

  const statusMap = {
    Waiting: "pending",
    "In-Consultation": "pending",
    Completed: "completed",
    Cancelled: "cancelled",
  };

  const patients = tokens.map((t) => ({
    token: `#${t.tokenNumber}`,
    name: t.patientId?.name || null,
    phone: t.patientId?.phone || null,
    complaints: t.chiefComplaints || null,
    status: t.status,
  }));

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
      patients,
    },
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
  getClinicPublicProfile,
  callNextPatient,
};
