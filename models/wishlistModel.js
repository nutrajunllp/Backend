const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  items: [
    {
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
    },
  ],
  updated_at: { type: Date, default: Date.now },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
