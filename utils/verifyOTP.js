const OTP = require("../models/OTP");
const ErrorHandler = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");

/**
 * @desc Common OTP Verification Function
 * @param {String} email - User's email
 * @param {String} otp - OTP entered by the user
 * @param {String} type - OTP type (register, login, order, etc.)
 * @returns {Boolean} - True if OTP is valid, otherwise throws an error
 */
const verifyOTP = async (email, otp, type) => {
  const otpEntry = await OTP.findOne({ email, type });

  if (!otpEntry) {
    throw new ErrorHandler("OTP not found", StatusCodes.BAD_REQUEST);
  }

  if (otpEntry.otp !== otp) {
    throw new ErrorHandler("Invalid OTP", StatusCodes.BAD_REQUEST);
  }

  if (new Date() > otpEntry.expires_at) {
    await OTP.deleteOne({ email, type });
    throw new ErrorHandler("OTP expired", StatusCodes.BAD_REQUEST);
  }

  await OTP.deleteOne({ email, type });
  return true;
};

module.exports = verifyOTP;
