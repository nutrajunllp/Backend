const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const ErrorHandler = require("../../middleware/errorHandler");
const { generateToken } = require("../../utils/tokenGenerator");
const Coustomer = require("../../models/customerModel");
const OTP = require("../../models/OTP");
const sendEmail = require("../../utils/sendMail");
const verifyOTP = require("../../utils/verifyOTP");
const otpTemplate = require("../../view/otpTemplate");

// Generate and send OTP
const sendOTP = async (email, type, next) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.findOneAndUpdate(
      { email, type },
      { otp, expires_at: new Date(Date.now() + 5 * 60 * 1000), type },
      { upsert: true }
    );

    const subject = "Your OTP Code";
    const message = otpTemplate(otp);
    await sendEmail.OTPEmail(email, subject, message);
  } catch (error) {
    throw new Error(error);
  }
};

// Register OTP
module.exports.sendRegisterOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return next(
        new ErrorHandler("Email is required", StatusCodes.BAD_REQUEST)
      );

    let existingUser = await Coustomer.findOne({ email });
    if (existingUser)
      return next(
        new ErrorHandler("Email already registered", StatusCodes.BAD_REQUEST)
      );

    await sendOTP(email, "register");
    res.status(StatusCodes.OK).json({
      success: true,
      message: "OTP sent to email. Verify to complete registration.",
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

// Verify Registration OTP
module.exports.verifyRegisterOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return next(
        new ErrorHandler("All fields are required", StatusCodes.BAD_REQUEST)
      );

    await verifyOTP(email, otp, "register");
    const newUser = new Coustomer({ email });
    await newUser.save();

    const token = generateToken(newUser);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully",
      data: newUser,
      token,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

// Login OTP
module.exports.sendLoginOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await Coustomer.findOne({ email });
    if (!user)
      return next(new ErrorHandler("User not found", StatusCodes.UNAUTHORIZED));

    await sendOTP(email, "login");
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: "OTP sent to email for login." });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

// Verify Login OTP
module.exports.verifyLoginOTP = async (req, res, next) => {
  try {
    const { email, otp, fcmToken } = req.body;
    if (!email || !otp)
      return next(
        new ErrorHandler("Email and OTP are required", StatusCodes.BAD_REQUEST)
      );

    await verifyOTP(email, otp, "login");
    const user = await Coustomer.findOne({ email });
    if (!user)
      return next(new ErrorHandler("User not found", StatusCodes.UNAUTHORIZED));

    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = generateToken(user);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful",
      data: {
        email: user.email,
        name: user.name,
        mobile_number: user.mobile_number,
        id: user._id,
      },
      token,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.checkCustomerByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(
        new ErrorHandler("Email is required", StatusCodes.BAD_REQUEST)
      );
    }

    const customer = await Coustomer.findOne({ email });

    if (customer) {
      return res.status(StatusCodes.OK).json({
        success: true,
        register: 1,
        email: customer.email,
        id: customer._id,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      register: 0,
      email,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};
