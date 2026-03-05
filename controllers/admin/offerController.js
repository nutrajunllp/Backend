const { StatusCodes } = require("http-status-codes");
const { default: mongoose } = require("mongoose");
const ErrorHandler = require("../../middleware/errorHandler");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStartDate = (date) => {
  if (!date) return date;
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

const normalizeEndDate = (date) => {
  if (!date) return date;
  const normalized = new Date(date);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate && endDate < startDate) {
    return "end_date must be greater than or equal to start_date";
  }
  return null;
};

module.exports.createOffer = async (req, res, next) => {
  try {
    const bannerImageFromUpload = req.file?.location;
    const {
      title,
      product,
      banner_image,
      status = 1,
      priority = 0,
      show_on_home = 1,
      start_date,
      end_date,
    } = req.body;

    if (!title || !product) {
      return next(
        new ErrorHandler("title and product are required", StatusCodes.BAD_REQUEST)
      );
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

    const normalizedStartDate = normalizeStartDate(parsedStartDate);
    const normalizedEndDate = normalizeEndDate(parsedEndDate);

    const dateError = validateDateRange(normalizedStartDate, normalizedEndDate);
    if (dateError) {
      return next(new ErrorHandler(dateError, StatusCodes.BAD_REQUEST));
    }

    const offer = await Offer.create({
      title,
      product,
      banner_image: bannerImageFromUpload || banner_image,
      status: Number(status),
      priority: Number(priority),
      show_on_home: Number(show_on_home),
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

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
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

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
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

module.exports.editOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const bannerImageFromUpload = req.file?.location;
    const {
      title,
      product,
      banner_image,
      status,
      priority,
      show_on_home,
      start_date,
      end_date,
    } = req.body;

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

    const parsedStartDate = start_date !== undefined ? parseDate(start_date) : undefined;
    const parsedEndDate = end_date !== undefined ? parseDate(end_date) : undefined;

    if (parsedStartDate === null || parsedEndDate === null) {
      return next(new ErrorHandler("Invalid date format", StatusCodes.BAD_REQUEST));
    }

    const normalizedStartDate =
      parsedStartDate !== undefined ? normalizeStartDate(parsedStartDate) : undefined;
    const normalizedEndDate =
      parsedEndDate !== undefined ? normalizeEndDate(parsedEndDate) : undefined;

    const startForValidation =
      normalizedStartDate !== undefined ? normalizedStartDate : existingOffer.start_date;
    const endForValidation =
      normalizedEndDate !== undefined ? normalizedEndDate : existingOffer.end_date;

    const dateError = validateDateRange(startForValidation, endForValidation);
    if (dateError) {
      return next(new ErrorHandler(dateError, StatusCodes.BAD_REQUEST));
    }

    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (product !== undefined) updatedData.product = product;
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
    if (normalizedStartDate !== undefined) updatedData.start_date = normalizedStartDate;
    if (normalizedEndDate !== undefined) updatedData.end_date = normalizedEndDate;

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
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

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

    if (deletedOffer.banner_image) {
      await deleteFileFromS3(deletedOffer.banner_image);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Offer deleted successfully",
      data: deletedOffer,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

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
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};
