const mongoose = require("mongoose");

// Submissions from the website's /affiliate-join form
const affiliateSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    state: { type: String, required: true, trim: true },
    website: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    tiktok: { type: String, trim: true, default: "" },
    facebook: { type: String, trim: true, default: "" },
    twitter: { type: String, trim: true, default: "" },
    youtube_channel: { type: String, trim: true, default: "" },
    promotion_plan: { type: String, required: true, trim: true },
    payment_method: { type: String, trim: true, default: "No Payment Method" },
    agree_terms: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Affiliate", affiliateSchema);
