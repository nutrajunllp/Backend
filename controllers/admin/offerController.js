const { StatusCodes } = require("http-status-codes");
const { default: mongoose } = require("mongoose");
const ErrorHandler = require("../../middleware/errorHandler");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStartDate = (date) => {
  if (!date) return date;
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const normalizeEndDate = (date) => {
  if (!date) return date;
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate && endDate < startDate) {
    return "end_date must be greater than or equal to start_date";
  }
  return null;
};

// ─── Create Offer ─────────────────────────────────────────────────────────────

module.exports.createOffer = async (req, res, next) => {
  try {
    const bannerImageFromUpload = req.file?.location;
    const {
      title,
      text = "",
      product,
      banner_image,
      discount_type,
      discount_value,
      status = 1,
      priority = 0,
      show_on_home = 1,
      end_date,
    } = req.body;
    console.log("CREATE OFFER BODYS:", req.body);
    console.log("CREATE OFFER FILE:", req.file);


    // Required field validation
    if (!title || !product) {
      return next(new ErrorHandler("title and product are required", StatusCodes.BAD_REQUEST));
    }
    if (!discount_type || !["percentage", "fixed"].includes(discount_type)) {
      return next(new ErrorHandler("discount_type must be 'percentage' or 'fixed'", StatusCodes.BAD_REQUEST));
    }
    if (discount_value === undefined || discount_value === null || discount_value === "") {
      return next(new ErrorHandler("discount_value is required", StatusCodes.BAD_REQUEST));
    }
    if (!start_date || !end_date) {
      return next(new ErrorHandler("start_date and end_date are required", StatusCodes.BAD_REQUEST));
    }

    if (!mongoose.Types.ObjectId.isValid(product)) {
      return next(new ErrorHandler("Invalid product id", StatusCodes.BAD_REQUEST));
    }

    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
      return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
    }

    const parsedStartDate = parseDate(start_date);
    const parsedEndDate = parseDate(end_date);
    if (parsedStartDate === null || parsedEndDate === null) {
      return next(new ErrorHandler("Invalid date format", StatusCodes.BAD_REQUEST));
    }

    const normalizedStart = normalizeStartDate(parsedStartDate);
    const normalizedEnd = normalizeEndDate(parsedEndDate);
    const dateError = validateDateRange(normalizedStart, normalizedEnd);
    if (dateError) {
      return next(new ErrorHandler(dateError, StatusCodes.BAD_REQUEST));
    }

    const offer = await Offer.create({
      title,
      text: text || "",
      product,
      banner_image: bannerImageFromUpload || banner_image || "",
      discount_type,
      discount_value: Number(discount_value),
      status: Number(status),
      priority: Number(priority),
      show_on_home: Number(show_on_home),
      start_date: normalizedStart,
      end_date: normalizedEnd,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── Get All Offers (Admin) ───────────────────────────────────────────────────

module.exports.getAllOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find()
      .populate("product", "name title main_image price status visibility_home")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Offers retrieved successfully",
      data: offers,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── Get Offer By ID (Admin) ──────────────────────────────────────────────────

module.exports.getOfferById = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return next(new ErrorHandler("Invalid offer id", StatusCodes.BAD_REQUEST));
    }

    const offer = await Offer.findById(offerId).populate(
      "product",
      "name title main_image price status visibility_home"
    );

    if (!offer) {
      return next(new ErrorHandler("Offer not found", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer retrieved successfully",
      data: offer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── Edit Offer ───────────────────────────────────────────────────────────────

module.exports.editOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const bannerImageFromUpload = req.file?.location;
    const {
      title,
      text,
      product,
      banner_image,
      discount_type,
      discount_value,
      status,
      priority,
      show_on_home,
      start_date,
      end_date,
    } = req.body;

    console.log("EDIT OFFER - INCOMING BODY:", req.body);
    console.log("EDIT OFFER - FILE:", req.file);

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return next(new ErrorHandler("Invalid offer id", StatusCodes.BAD_REQUEST));
    }

    const existingOffer = await Offer.findById(offerId);
    if (!existingOffer) {
      return next(new ErrorHandler("Offer not found", StatusCodes.NOT_FOUND));
    }

    if (product !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(product)) {
        return next(new ErrorHandler("Invalid product id", StatusCodes.BAD_REQUEST));
      }
      const existingProduct = await Product.findById(product);
      if (!existingProduct) {
        return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
      }
    }

    if (discount_type !== undefined && !["percentage", "fixed"].includes(discount_type)) {
      return next(new ErrorHandler("discount_type must be 'percentage' or 'fixed'", StatusCodes.BAD_REQUEST));
    }

    const parsedStartDate = start_date !== undefined ? parseDate(start_date) : undefined;
    const parsedEndDate = end_date !== undefined ? parseDate(end_date) : undefined;
    if (parsedStartDate === null || parsedEndDate === null) {
      return next(new ErrorHandler("Invalid date format", StatusCodes.BAD_REQUEST));
    }

    const normalizedStart = parsedStartDate !== undefined ? normalizeStartDate(parsedStartDate) : undefined;
    const normalizedEnd = parsedEndDate !== undefined ? normalizeEndDate(parsedEndDate) : undefined;

    const startForValidation = normalizedStart !== undefined ? normalizedStart : existingOffer.start_date;
    const endForValidation = normalizedEnd !== undefined ? normalizedEnd : existingOffer.end_date;
    const dateError = validateDateRange(startForValidation, endForValidation);
    if (dateError) {
      return next(new ErrorHandler(dateError, StatusCodes.BAD_REQUEST));
    }

    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (text !== undefined) updatedData.text = text;
    if (product !== undefined) updatedData.product = product;
    if (discount_type !== undefined) updatedData.discount_type = discount_type;
    if (discount_value !== undefined) updatedData.discount_value = Number(discount_value);
    if (banner_image !== undefined) updatedData.banner_image = banner_image;
    if (bannerImageFromUpload) {
      if (existingOffer.banner_image) {
        await deleteFileFromS3(existingOffer.banner_image);
      }
      updatedData.banner_image = bannerImageFromUpload;
    }
    if (status !== undefined) updatedData.status = Number(status);
    if (priority !== undefined) updatedData.priority = Number(priority);
    if (show_on_home !== undefined) updatedData.show_on_home = Number(show_on_home);
    if (normalizedStart !== undefined) updatedData.start_date = normalizedStart;
    if (normalizedEnd !== undefined) updatedData.end_date = normalizedEnd;

    const updatedOffer = await Offer.findByIdAndUpdate(offerId, updatedData, {
      new: true,
      runValidators: true,
    }).populate("product", "name title main_image price status visibility_home");

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer updated successfully",
      data: updatedOffer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── Delete Offer ─────────────────────────────────────────────────────────────

module.exports.deleteOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return next(new ErrorHandler("Invalid offer id", StatusCodes.BAD_REQUEST));
    }

    const deletedOffer = await Offer.findByIdAndDelete(offerId);
    if (!deletedOffer) {
      return next(new ErrorHandler("Offer not found", StatusCodes.NOT_FOUND));
    }

    // Delete banner image from S3 if it exists
    if (deletedOffer.banner_image) {
      await deleteFileFromS3(deletedOffer.banner_image);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer deleted successfully",
      data: deletedOffer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ─── Delete Offer Banner Image ──────────────────────────────────────────────

module.exports.deleteOfferBannerImage = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return next(new ErrorHandler("Invalid offer id", StatusCodes.BAD_REQUEST));
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new ErrorHandler("Offer not found", StatusCodes.NOT_FOUND));
    }

    if (!offer.banner_image) {
      return next(new ErrorHandler("Banner image not found", StatusCodes.NOT_FOUND));
    }

    await deleteFileFromS3(offer.banner_image);
    offer.banner_image = "";
    await offer.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer banner image deleted successfully",
      data: offer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
