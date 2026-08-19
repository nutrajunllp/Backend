const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    minimumCartAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    note: {
      type: String,
    },
    expiryDate: {
      type: Date,
    },
    noExpiry: {
      type: Boolean,
      default: false,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    usageCount: {
      type: Number,
      default: 0,
    },
    minimumCartQuantity: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);