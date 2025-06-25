const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  mobile_number: {
    type: String,
    validate: {
      validator: function (v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: "Invalid mobile number format",
    },
  },
  password: {
    type: String,
    required: true,
  },
  fcmToken: {
    type: String,
  },
  status: {
    type: Number,
    enum: [0, 1],
    default: 1,
  },
  role: {
    type: String,
    default: "admin",
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
