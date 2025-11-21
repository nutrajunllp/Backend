const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const ErrorHandler = require("../../middleware/errorHandler");
const { generateToken } = require("../../utils/tokenGenerator");
const Admin = require("../../models/adminModel");
const OTP = require("../../models/OTP");
const { sendOTP } = require("../../utils/verifyOTP");

module.exports.sendAdminLoginOTP = async (req, res, next) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const { email } = req.body;

    if (!email)
      return next(new ErrorHandler("Email is required", StatusCodes.BAD_REQUEST));

    if (email !== adminEmail)
      return next(new ErrorHandler("Unauthorized email", StatusCodes.UNAUTHORIZED));

    await sendOTP(email, "admin");

    res.status(StatusCodes.OK).json({
      success: true,
      message: "OTP sent to admin email",
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.loginAdmin = async (req, res, next) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const { email, otp } = req.body;

    if (!email || !otp)
      return next(new ErrorHandler("Email and OTP are required", StatusCodes.BAD_REQUEST));

    if (email !== adminEmail)
      return next(new ErrorHandler("Unauthorized email", StatusCodes.UNAUTHORIZED));

    const otpRecord = await OTP.findOne({ email, type: "admin" });
    if (!otpRecord)
      return next(new ErrorHandler("OTP not found", StatusCodes.NOT_FOUND));

    if (otpRecord.expires_at < Date.now())
      return next(new ErrorHandler("OTP expired", StatusCodes.BAD_REQUEST));

    if (otpRecord.otp !== otp)
      return next(new ErrorHandler("Invalid OTP", StatusCodes.BAD_REQUEST));

    await OTP.deleteOne({ _id: otpRecord._id });

    let admin = await Admin.findOne({ email });
    if (!admin) {
      admin = await Admin.create({ email });
    }

    const token = generateToken(admin);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Admin login successful",
      token,
    });

  } catch (error) {
    return next(new ErrorHandler(error.message || "Server error", StatusCodes.INTERNAL_SERVER_ERROR));
  }
};