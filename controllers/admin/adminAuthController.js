const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const ErrorHandler = require("../../middleware/errorHandler");
const { generateToken } = require("../../utils/tokenGenerator");
const Admin = require("../../models/adminModel");

module.exports.registerAdmin = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return next(new ErrorHandler("All fields are required", StatusCodes.BAD_REQUEST));
    }

    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return next(new ErrorHandler("Email already registered", StatusCodes.BAD_REQUEST));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, name, password: hashedPassword });
    await newAdmin.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Admin registered successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Server error", StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorHandler("Email and password are required", StatusCodes.BAD_REQUEST));
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return next(new ErrorHandler("Invalid credentials", StatusCodes.UNAUTHORIZED));
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return next(new ErrorHandler("Invalid credentials", StatusCodes.UNAUTHORIZED));
    }

    const token = generateToken(admin);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Server error", StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
