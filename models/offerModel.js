const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    banner_image: {
      type: String,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    priority: {
      type: Number,
      default: 0,
    },
    show_on_home: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
