const { StatusCodes } = require("http-status-codes");
const Order = require("../../models/orderModel");
const Product = require("../../models/productModel");
const ErrorHandler = require("../../middleware/errorHandler");
const Customer = require("../../models/customerModel");
const couponModel = require("../../models/couponModel");

module.exports.getAdminDashboardCounts = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalUnitsSoldAgg,
      todayUnitsSoldAgg,
      todaySalesAgg,
      newOrdersCount,
      activeProductsCount,
      totalCustomersCount,
    ] = await Promise.all([
      Order.aggregate([
        { $unwind: "$items" },
        { $match: { order_status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$items.quantity" },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            order_status: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            todayUnits: { $sum: "$items.quantity" },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            order_status: { $in: ["pending", "accept"] },
          },
        },
        {
          $group: {
            _id: null,
            todaySales: { $sum: "$payment.total_amount" },
          },
        },
      ]),

      Order.countDocuments({
        order_status: { $in: ["pending", "processing"] },
      }),

      Product.countDocuments({ status: 1 }),

      Customer.countDocuments({}),
    ]);

    const totalUnitsSold = totalUnitsSoldAgg[0]?.totalUnits || 0;
    const currentDayUnitsSold = todayUnitsSoldAgg[0]?.todayUnits || 0;
    const currentDaySales = todaySalesAgg[0]?.todaySales || 0;

    return res.status(200).json({
      success: true,
      message: "Admin dashboard summary retrieved",
      data: {
        total_units_sold: totalUnitsSold,
        current_day_units_sold: currentDayUnitsSold,
        current_day_sales: currentDaySales,
        new_orders: newOrdersCount,
        total_customers: totalCustomersCount,
        active_products: activeProductsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getDashboardChart = async (req, res, next) => {
  try {
    const { type } = req.query;

    if (!["revenue", "units"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Use 'revenue' or 'units'.",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 10; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    const startDate = dates[0];
    const endDate = new Date(dates[dates.length - 1]);
    endDate.setHours(23, 59, 59, 999);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          order_status: { $in: ["pending", "accept"] },
        },
      },
    ];

    if (type === "units") {
      pipeline.push({ $unwind: "$items" });
    }

    pipeline.push({
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        date: { $first: { $dateTrunc: { date: "$createdAt", unit: "day" } } },
        total: {
          $sum:
            type === "revenue" ? "$payment.total_amount" : "$items.quantity",
        },
      },
    });

    pipeline.push({ $sort: { date: 1 } });

    const result = await Order.aggregate(pipeline);

    const resultMap = {};
    result.forEach((entry) => {
      const key = new Date(entry.date).toISOString().split("T")[0];
      resultMap[key] = entry.total;
    });

    const chartData = dates.map((date) => {
      const key = date.toISOString().split("T")[0];
      return {
        date: date.toISOString(),
        total: resultMap[key] || 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: `Chart data for ${type} (last 10 days excluding today)`,
      data: chartData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getOrderSummary = async (req, res, next) => {
  try {
    const orders = await Order.find(
      {},
      "_id order_status payment.payment_status shipment.is_shipment_confirmed"
    );

    const summary = {
      total_orders: orders.length,
      pending_payment: [],
      accepted_orders: [],
      not_accepted_orders: [],
      shipment_not_confirmed: [],
      delivered_orders: [],
      cancelled_orders: [],
    };

    orders.forEach((order) => {
      const { _id, order_status, payment, shipment } = order;

      if (
        payment?.payment_status !== "Paid" &&
        payment?.payment_method !== "COD"
      ) {
        summary.pending_payment.push(_id);
      }

      if (order_status === "accept") {
        summary.accepted_orders.push(_id);

        if (shipment?.is_shipment_confirmed === 0) {
          summary.shipment_not_confirmed.push(_id);
        }
      } else {
        summary.not_accepted_orders.push(_id);

        if (shipment?.is_shipment_confirmed === 0) {
          summary.shipment_not_confirmed.push(_id);
        }
      }

      if (order_status === "delivered") {
        summary.delivered_orders.push(_id);
      }

      if (order_status === "cancelled") {
        summary.cancelled_orders.push(_id);
      }
    });

    const response = Object.fromEntries(
      Object.entries(summary).map(([key, ids]) => [
        key,
        { count: ids.length, ids },
      ])
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Order summary retrieved successfully",
      data: response,
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

module.exports.getTodayOrders = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    })
      .select("_id orderID order_status payment.total_amount customer_details")
      .sort({ createdAt: -1 });

    const formattedOrders = todayOrders.map((order) => ({
      _id: order._id,
      orderId: order.orderID,
      price: order.payment?.total_amount || 0,
      status: order.order_status,
      coustomer_details: order.customer_details || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "Today's orders retrieved successfully",
      data: formattedOrders,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getAllCouponsAnalytics = async (req, res, next) => {
  try {
    const coupons = await couponModel.find().lean();

    if (!coupons.length) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No coupons found.",
        data: [],
      });
    }

    // Get all orders that used any coupon
    const orders = await Order.find({
      coupon_id: { $exists: true, $ne: null },
      "payment.payment_status": "Paid",
    })
      .select("coupon_id payment.total_amount")
      .lean();

    // Group orders by couponId
    const analytics = coupons.map((coupon) => {
      const couponOrders = orders.filter(
        (order) => order.coupon_id?.toString() === coupon._id.toString()
      );

      const totalOrders = couponOrders.length;
      const totalRevenue = couponOrders.reduce(
        (sum, order) => sum + (order.payment.total_amount || 0),
        0
      );

      return {
        _id: coupon._id,
        code: coupon.code,
        percentage: coupon.percentage,
        status: coupon.status,
        expiryDate: coupon.expiryDate,
        noExpiry: coupon.noExpiry,
        usageCount: coupon.usageCount,
        totalOrders,
        totalRevenue,
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      totalCoupons: analytics.length,
      data: analytics,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};