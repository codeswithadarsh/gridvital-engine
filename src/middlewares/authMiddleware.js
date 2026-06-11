const jwt = require("jsonwebtoken");
const Clinic = require("../models/Clinic");
const asyncHandler = require("../utils/asyncHandler");

const protectClinic = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const clinic = await Clinic.findById(decoded.id);

    if (!clinic || !clinic.isActive) {
      res.status(401);
      throw new Error("Not authorized, clinic not found or inactive");
    }

    req.clinicId = clinic._id;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, invalid token");
  }
});

const protectOps = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Clinic.findById(decoded.id);

    if (!user || !["GRID_OPS", "GRID_RM"].includes(user.role)) {
      res.status(401);
      throw new Error("Not authorized, OPS access only");
    }

    req.opsId = user._id;
    req.opsRole = user.role;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, invalid token");
  }
});

module.exports = { protectClinic, protectOps };
