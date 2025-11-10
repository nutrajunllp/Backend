const Coupon = require("../../models/couponModel");
const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const orderModel = require("../../models/orderModel");

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

module.exports.getCouponAnalyticsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch coupon
    const coupon = await Coupon.findById(id).lean();
    if (!coupon) {
      return next(new ErrorHandler("Coupon not found", StatusCodes.NOT_FOUND));
    }

    // Fetch all orders linked with this coupon
    const orders = await orderModel.find({ coupon_id: id })
      .populate("customer", "name email phone")
      .lean();

    if (!orders.length) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No orders found for this coupon.",
        data: {
          code: coupon.code,
          percentage: coupon.percentage,
          status: coupon.status,
          totalOrders: 0,
          totalRevenue: 0,
          orders: [],
        },
      });
    }

    // Calculate total revenue and build detailed order list
    let totalRevenue = 0;

    const orderDetails = orders.map((order) => {
      const paidAmount = order.payment?.payment_details?.amount || 0;
      const totalQty = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      totalRevenue += paidAmount;

      return {
        orderId: order.orderID,
        customer: order.customer_details?.name || "N/A",
        email: order.customer_details?.email || "N/A",
        phone: order.customer_details?.phone || "N/A",
        payment_status: order.payment?.payment_status || "Pending",
        payment_method: order.payment?.payment_method || "Pending",
        paid_amount: paidAmount,
        total_quantity: totalQty,
        order_status: order.order_status,
        shipment_status: order.shipment?.shipment_status || "pending",
        createdAt: order.createdAt,
      };
    });

    // Response
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        code: coupon.code,
        percentage: coupon.percentage,
        status: coupon.status,
        expiryDate: coupon.expiryDate,
        noExpiry: coupon.noExpiry,
        usageCount: coupon.usageCount,
        totalOrders: orders.length,
        totalRevenue,
        orders: orderDetails,
      },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};