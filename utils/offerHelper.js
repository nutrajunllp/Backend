const Offer = require("../models/offerModel");

/**
 * Calculates the discounted price for a product based on its highest priority active offer.
 * @param {string} productId - ID of the product
 * @param {number} websitePrice - Current website price of the product
 * @returns {Promise<number|null>} Discounted price or null if no active offer
 */
const getActiveDiscountedPrice = async (productId, websitePrice) => {
  const now = new Date();
  
  // Find highest priority active offer (by date and status)
  const offer = await Offer.findOne({
    product: productId,
    status: 1,
    start_date: { $lte: now },
    end_date: { $gte: now },
  }).sort({ priority: -1, createdAt: -1 });

  if (!offer) return null;

  const price = Number(websitePrice);
  if (isNaN(price) || price <= 0) return null;

  let discounted = price;
  if (offer.discount_type === "percentage") {
    // Round to 2 decimals
    discounted = price - (price * (offer.discount_value || 0)) / 100;
  } else if (offer.discount_type === "fixed") {
    discounted = price - (offer.discount_value || 0);
  }
  
  // Return rounded to 2 decimals, ensuring not negative
  return Math.max(0, Math.round(discounted * 100) / 100);
};

module.exports = {
  getActiveDiscountedPrice
};
