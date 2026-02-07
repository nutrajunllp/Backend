const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    image_url: {
      type: String,
    },
    video_url: {
      type: String,
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

// Validate: image type needs image_url, video type needs video_url
gallerySchema.pre("validate", function (next) {
  if (this.type === "image" && !this.image_url) {
    next(new Error("image_url is required when type is image"));
  } else if (this.type === "video" && !this.video_url) {
    next(new Error("video_url is required when type is video"));
  } else {
    next();
  }
});

module.exports = mongoose.model("Gallery", gallerySchema);
