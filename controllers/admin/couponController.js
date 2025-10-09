const Coupon = require("../../models/couponModel");
const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");

module.exports.createCoupon = async (req, res, next) => {
  try {
    const { code, percentage, status, note, expiryDate, noExpiry } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return next(new ErrorHandler("Coupon code already exists", StatusCodes.BAD_REQUEST));
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      percentage,
      status,
      note,
      expiryDate: noExpiry ? null : expiryDate,
      noExpiry: !!noExpiry,
    });

    await newCoupon.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Coupon created successfully",
      data: newCoupon,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.noExpiry) {
      updateData.expiryDate = null;
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoupon) {
      return next(new ErrorHandler("Coupon not found", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Coupon updated successfully",
      data: updatedCoupon,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Coupon.findByIdAndDelete(id);

    if (!deleted) {
      return next(new ErrorHandler("Coupon not found", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id).populate("orderIds");

    if (!coupon) {
      return next(new ErrorHandler("Coupon not found", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: coupon,
      totalOrders: coupon.orderIds.length,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    const result = coupons.map((c) => ({
      ...c.toObject(),
      totalOrders: c.orderIds.length,
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      count: coupons.length,
      data: result,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
