const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["home", "work", "other"],
    default: "home",
  },
  address_line_1: {
    type: String,
  },
  address_line_2: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
    default: "India",
  },
  pincode: {
    type: String,
  },
  is_default: {
    type: Boolean,
    default: false,
  },
});

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    profile_photo: {
      type: String
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
    fcmToken: {
      type: String,
    },
    role: {
      type: String,
      default: "customer",
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    addresses: [addressSchema],
    cart: {
      cart_id: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Cart",
        },
      ],
      total: {
        type: Number,
        default: 0,
      },
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;
