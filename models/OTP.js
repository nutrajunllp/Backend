const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: false,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["register", "login", "order", "return", "reset_password"], 
    required: true,
  },
  expires_at: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const OTP = mongoose.model("OTP", otpSchema);
module.exports = OTP;
