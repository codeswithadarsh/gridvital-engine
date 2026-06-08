const jwt = require("jsonwebtoken");

const generateToken = (clinicId) => {
  return jwt.sign({ id: clinicId }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

module.exports = { generateToken };
