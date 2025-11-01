const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gallery", gallerySchema);
