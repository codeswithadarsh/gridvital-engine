const Clinic = require("../models/Clinic");
const Token = require("../models/Token");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { generateToken } = require("../utils/tokenUtils");

const opsLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await Clinic.findOne({
    email,
    role: { $in: ["GRID_OPS", "GRID_RM"] },
  }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid OPS credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid OPS credentials");
  }

  const token = generateToken(user._id);

  res.json({ success: true, userType: "GRID_OPS", token });
});

const registerOps = asyncHandler(async (req, res) => {
  if (req.opsRole !== "GRID_OPS") {
    res.status(403);
    throw new Error("Only GRID_OPS can create new OPS accounts");
  }

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400);
    throw new Error("email, password, and name are required");
  }

  const exists = await Clinic.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("Account with this email already exists");
  }

  const ops = await Clinic.create({
    email,
    password,
    doctorName: name,
    role: "GRID_OPS",
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: "GRID_OPS account created successfully",
    data: {
      id: ops._id,
      email: ops.email,
      name: ops.doctorName,
      role: ops.role,
    },
  });
});

const registerRm = asyncHandler(async (req, res) => {
  if (req.opsRole !== "GRID_OPS") {
    res.status(403);
    throw new Error("Only GRID_OPS can create RM accounts");
  }

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400);
    throw new Error("email, password, and name are required");
  }

  const exists = await Clinic.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("Account with this email already exists");
  }

  const rm = await Clinic.create({
    email,
    password,
    doctorName: name,
    role: "GRID_RM",
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: "GRID_RM account created successfully",
    data: {
      id: rm._id,
      email: rm.email,
      name: rm.doctorName,
      role: rm.role,
    },
  });
});

const listClinics = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 10, searchTerm } = req.body;

  const filter = { role: "CLINIC" };
  if (searchTerm && searchTerm.trim()) {
    const regex = new RegExp(searchTerm.trim(), "i");
    filter.$or = [
      { clinicName: regex },
      { doctorName: regex },
      { email: regex },
      { clinicDisplayId: regex },
    ];
  }

  const total = await Clinic.countDocuments(filter);
  const clinics = await Clinic.find(filter)
    .select(
      "clinicDisplayId clinicName doctorName email phone city isActive createdAt"
    )
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  res.json({
    success: true,
    data: clinics,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

const clinicDetails = asyncHandler(async (req, res) => {
  const { clinicId } = req.body;

  if (!clinicId) {
    res.status(400);
    throw new Error("clinicId is required");
  }

  const clinic = await Clinic.findById(clinicId).select("-password").lean();
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  const latestOtp = await Clinic.findById(clinicId)
    .select("otp otpExpiresAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      clinic,
      latestOtpLog: latestOtp
        ? {
            otp: latestOtp.otp,
            otpExpiresAt: latestOtp.otpExpiresAt,
            createdAt: latestOtp.createdAt,
          }
        : null,
    },
  });
});

const manageSubscription = asyncHandler(async (req, res) => {
  const { clinicId, startDate, endDate, amountPaid, planType } = req.body;

  if (!clinicId || !planType) {
    res.status(400);
    throw new Error("clinicId and planType are required");
  }

  let updates;

  if (planType === "EXPIRED") {
    updates = {
      subscriptionType: "EXPIRED",
      subscriptionExpiresAt: new Date(),
      subscriptionAmount: 0,
    };
  } else {
    if (!startDate || !endDate) {
      res.status(400);
      throw new Error(
        "startDate and endDate are required for this plan type"
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400);
      throw new Error("Invalid date format");
    }

    if (end <= start) {
      res.status(400);
      throw new Error("endDate must be strictly greater than startDate");
    }

    updates = {
      subscriptionType: planType,
      subscriptionStartAt: start,
      subscriptionExpiresAt: end,
      subscriptionAmount:
        planType === "PAID_SUBSCRIBED" &&
        typeof amountPaid === "number" &&
        amountPaid >= 0
          ? amountPaid
          : 0,
    };
  }

  const clinic = await Clinic.findByIdAndUpdate(clinicId, updates, {
    new: true,
    runValidators: true,
  });

  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  res.json({ success: true, message: "Subscription updated successfully" });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { clinicId } = req.body;

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  await Promise.all([
    Clinic.findByIdAndDelete(clinicId),
    Token.deleteMany({ clinicId }),
    Patient.deleteMany({ clinicId }),
  ]);

  res.json({
    success: true,
    message: "Clinic and all associated data permanently deleted",
  });
});

module.exports = {
  opsLogin,
  registerOps,
  registerRm,
  listClinics,
  clinicDetails,
  manageSubscription,
  deleteClinic,
};
