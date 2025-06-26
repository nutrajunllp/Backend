const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  short_description: { type: String, required: true },
  disclaimer: [{ type: String }],
  category: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  // size: [
  //   {
  //     title: { type: String },
  //     package_weight: { type: String },
  //     selected: { type: Number, enum: [0, 1], default: 0 },
  //     qty: { type: String },
  //     number_of_piecces: { type: Number },
  //     price: {
  //       website_price: { type: String },
  //       discounted_price: { type: String },
  //       per_kg_price: { type: String },
  //     },
  //   },
  // ],
  url_key: { type: String },
  qty: { type: Number, required: true },
  stock_availability: { type: Number, enum: [0, 1], required: true },
  visibility_home: { type: Number, enum: [0, 1], required: true },
  status: { type: Number, enum: [0, 1], default: 0 },
  sku: { type: String, required: true, unique: true },
  price: {
    website_price: { type: Number, required: true },
    product_price: { type: Number, required: true },
    discounted_percentage: { type: Number },
    shipping_charge: { type: Number },
  },
  platform_link: {
    amazon: { type: String },
    flipkart: { type: String },
  },
  inquiry: {
    enabled: { type: Number, enum: [0, 1], default: 0 },
  },
  meta: {
    meta_title: { type: String },
    meta_description: { type: String },
    meta_keywords: { type: String },
  },
  product_details: {
    diet_type: { type: String },
    flavor: { type: String },
    item_form: { type: String },
    brand: { type: String },
    speciality: { type: String },
    number_of_piecces: { type: String },
    package_weight: { type: String },
  },
  additional_information: {
    generic_name: { type: String },
    weight: { type: String },
    dimensions: { type: String },
    marketed_by: { type: String },
    country_of_origin: { type: String },
    best_before: { type: String },
    manufacturer: { type: String },
    license_no: { type: String },
    customer_care_details: { type: String },
  },
  key_benefits: [
    {
      title: { type: String },
      description: { type: String },
    },
  ],
  images: [
    {
      name: { type: String },
      num: { type: Number },
    },
  ],
  videos: [
    {
      name: { type: String },
      num: { type: Number },
    },
  ],
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      user_details: {
        name: { type: String, required: true },
        email: { type: String },
        mobile_number: { type: String },
      },
      rating: { type: Number, min: 1, max: 5, required: true },
      order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
      comment: { type: String, required: true },
      image: { type: String },
      visible: { type: Number, enum: [0, 1], default: 1 },
      created_at: { type: Date, default: Date.now },
    },
  ],
  payment_detail: {
    free_shipping: { type: Number, enum: [0, 1] },
    cod_available: { type: Number, enum: [0, 1] },
  },

  updated_at: { type: Date, default: Date.now },
});

// productSchema.methods.toJSON = function () {
//   const product = this.toObject();
//   product.reviews = product.reviews?.filter((rev) => rev.visible === 1);
//   return product;
// };

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
