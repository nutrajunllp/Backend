const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    main_title: {
      type: String,
      required: true,
      trim: true,
    },
    main_image: {
      type: String, 
    },
    content: [
      {
        title: { type: String },
        description: { type: String },
        image: { type: String }, 
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);