const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
 lastOrderNumber: {
    type: Number,
    required: true,
    default: 10000,
  },
});

const Counter = mongoose.model("OrderCounter", counterSchema);
module.exports = Counter;
