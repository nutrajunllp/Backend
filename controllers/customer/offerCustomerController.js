const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Offer = require("../../models/offerModel");

// Helper: format a JS Date as YYYY-MM-DD in IST timezone
const formatDateIST = (date) => {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Helper: calculate discounted price based on offer
const applyDiscount = (websitePrice, offer) => {
  if (!websitePrice || !offer) return null;
  const price = Number(websitePrice);
  if (isNaN(price) || price <= 0) return null;

  if (offer.discount_type === "percentage") {
    const discounted = price - (price * offer.discount_value) / 100;
    return Math.max(0, Math.round(discounted * 100) / 100);
  }
  if (offer.discount_type === "fixed") {
    const discounted = price - offer.discount_value;
    return Math.max(0, Math.round(discounted * 100) / 100);
  }
  return null;
};

// Check if offer is currently valid within date range
const isOfferCurrentlyActive = (offer) => {
  const now = new Date();
  const todayIST = formatDateIST(now);
  const startIST = formatDateIST(offer.start_date);
  const endIST = formatDateIST(offer.end_date);
  
  const isActive = (!startIST || todayIST >= startIST) && (!endIST || todayIST <= endIST);
  
  console.log(`OFFER DATE CHECK: ID=${offer._id}, Today=${todayIST}, Start=${startIST}, End=${endIST}, Active=${isActive}, Status=${offer.status}`);
  return isActive;
};

// ─── GET /customer/offer/home ─────────────────────────────────────────────────
module.exports.getHomeOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({ status: 1, show_on_home: 1 })
      .populate({
        path: "product",
        select: "name title main_image price status visibility_home sku",
        match: { status: 1 },
      })
      .sort({ priority: -1, createdAt: -1 });

    const activeOffers = offers
      .filter((offer) => offer.product && isOfferCurrentlyActive(offer))
      .map((offer) => {
        const websitePrice = offer.product?.price?.website_price ?? offer.product?.price?.current_price ?? null;
        const discountedPrice = applyDiscount(websitePrice, offer);
        return {
          ...offer.toObject(),
          computed: {
            original_price: websitePrice,
            discounted_price: discountedPrice,
          },
        };
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Home offers retrieved successfully",
      data: activeOffers,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── GET /customer/offer/product/:productId ───────────────────────────────────
module.exports.getOfferForProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    console.log(`GET OFFER FOR PRODUCT: PID=${productId}`);

    const offer = await Offer.findOne({
      product: productId,
      status: 1,
    }).sort({ priority: -1, createdAt: -1 });

    if (!offer) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No active offer for this product",
        data: null,
      });
    }

    if (!isOfferCurrentlyActive(offer)) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No active offer for this product",
        data: null,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer retrieved successfully",
      data: offer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
