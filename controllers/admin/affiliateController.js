const Affiliate = require("../../models/affiliateModel");
const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");

const OPTIONAL_FIELDS = ["website", "instagram", "tiktok", "facebook", "twitter", "youtube_channel"];

exports.createAffiliate = async (req, res, next) => {
  try {
    const { first_name, last_name, email, state, promotion_plan, payment_method, agree_terms } = req.body;

    if (!first_name || !last_name || !email || !state || !promotion_plan) {
      return next(new ErrorHandler("Please fill all required fields.", StatusCodes.BAD_REQUEST));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return next(new ErrorHandler("Please enter a valid email address.", StatusCodes.BAD_REQUEST));
    }
    if (agree_terms !== true && agree_terms !== "true") {
      return next(new ErrorHandler("Please accept the terms and conditions.", StatusCodes.BAD_REQUEST));
    }

    const data = {
      first_name,
      last_name,
      email,
      state,
      promotion_plan,
      payment_method: payment_method || "No Payment Method",
      agree_terms: true,
    };
    OPTIONAL_FIELDS.forEach((field) => {
      if (typeof req.body[field] === "string") data[field] = req.body[field];
    });

    const affiliate = await Affiliate.create(data);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Thank you! Your affiliate request has been submitted.",
      data: affiliate,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

exports.getAllAffiliates = async (req, res, next) => {
  try {
    const affiliates = await Affiliate.find().sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "All affiliate requests fetched successfully.",
      data: affiliates,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

exports.getSingleAffiliate = async (req, res, next) => {
  try {
    const affiliate = await Affiliate.findById(req.params.affiliateId);

    if (!affiliate) {
      return next(new ErrorHandler("Affiliate request not found.", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Affiliate request fetched successfully.",
      data: affiliate,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

exports.deleteMultipleAffiliates = async (req, res, next) => {
  try {
    const { affiliateIds, affiliateId } = req.body || {};
    const ids = Array.isArray(affiliateIds)
      ? affiliateIds
      : typeof affiliateId === "string" && affiliateId.trim()
        ? [affiliateId.trim()]
        : [];

    if (!ids.length) {
      return next(
        new ErrorHandler(
          "Provide at least one id in affiliateIds (array) or affiliateId (string).",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const result = await Affiliate.deleteMany({ _id: { $in: ids } });

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${result.deletedCount} affiliate request(s) deleted successfully.`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
