const Clinic = require("../models/Clinic");
const asyncHandler = require("../utils/asyncHandler");

const checkSubscriptionStatus = asyncHandler(async (req, res, next) => {
  const { clinicDisplayId } = req.body;

  if (!clinicDisplayId) {
    res.status(400);
    throw new Error("clinicDisplayId is required");
  }

  const clinic = await Clinic.findOne({ clinicDisplayId });
  if (!clinic) {
    res.status(404);
    throw new Error("Clinic not found");
  }

  const now = new Date();
  if (now > clinic.subscriptionExpiresAt) {
    if (clinic.subscriptionType !== "EXPIRED") {
      clinic.subscriptionType = "EXPIRED";
      await clinic.save();
    }
    res.status(402);
    throw new Error(
      "Subscription Ended: Patient onboarding is temporarily suspended for this clinic. Please contact support to renew your plan."
    );
  }

  req.clinicId = clinic._id;
  next();
});

module.exports = { checkSubscriptionStatus };
