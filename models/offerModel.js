const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    banner_image: {
      type: String,
      default: "",
    },
    discount_type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1, // 1 = Active, 0 = Inactive
    },
    priority: {
      type: Number,
      default: 0,
    },
    show_on_home: {
      type: Number,
      enum: [0, 1],
      default: 1, // 1 = Yes, 0 = No
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
