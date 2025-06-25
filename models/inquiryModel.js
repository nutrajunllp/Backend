const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  size: {
    size_id: { type: mongoose.Schema.Types.ObjectId }, // ID of selected size
    title: { type: String }, // Size title
    volume: { type: String }, // Size volume
  },
  status: {
    type: String,
    enum: ["Pending", "Contacted"],
    default: "Pending",
  },
  updated_at: { type: Date, default: Date.now },
});

const Inquiry = mongoose.model("Inquiry", inquirySchema);
module.exports = Inquiry;
