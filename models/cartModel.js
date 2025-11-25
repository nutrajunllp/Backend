const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  customer_id: {
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
        package_weight: { type: String },
        number_of_piecces: { type: String },
      },
      price: {
        item_price: { type: Number },
        total_price: { type: Number },
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
    },
  ],
  updated_at: { type: Date, default: Date.now },
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
