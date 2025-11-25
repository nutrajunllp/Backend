const { StatusCodes } = require("http-status-codes");
const Order = require("../../models/orderModel");
const ErrorHandler = require("../../middleware/errorHandler");
const razorpay = require("../../utils/razorpayClient");
const crypto = require("crypto");
const Product = require("../../models/productModel");
const { sendPlacedOrderMail, sendPaymentStatusMail } = require("../emailController");
const Coupon = require("../../models/couponModel");

module.exports.placeOrder = async (req, res, next) => {
  try {
    const { customer, customer_details, items, shipping_address, coupon_id, notes } = req.body;

    if (!items || items.length === 0) {
      return next(new ErrorHandler("Items are required", StatusCodes.BAD_REQUEST));
    }

    let product_total = 0;
    let discount_amount = 0;
    let coupon_discount_amount = 0;
    let shipping_charge = 0;

    const populatedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.product).lean();
      if (!product) {
        return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
      }

      const websitePrice = product.price?.website_price || 0;
      const discountPercentage = product.price?.discounted_percentage || 0;
      const perProductShipping = product.price?.shipping_charge || 0;

      const item_price = websitePrice;
      const qty = it.quantity || 1;

      const item_discount = (item_price * discountPercentage) / 100;
      discount_amount += item_discount * qty;

      const item_total = item_price * qty;
      product_total += item_total;

      shipping_charge += perProductShipping;

      populatedItems.push({
        product: it.product,
        sku: it.sku,
        size: it.size,
        name: product.name,
        image_url: product.main_image,
        price: {
          item_price,
          total_price: item_total,
        },
        quantity: qty,
      });
    }

    let couponDetails = null;
    if (coupon_id) {
      couponDetails = await Coupon.findOne({
        _id: coupon_id,
        status: "active",
        $or: [
          { noExpiry: true },
          { expiryDate: { $gte: new Date() } }
        ]
      });

      if (couponDetails && couponDetails.percentage) {
        coupon_discount_amount =
          Number(((product_total * couponDetails.percentage) / 100).toFixed(2));
      }
    }

    const total_amount = Number(
      (product_total - discount_amount - coupon_discount_amount + shipping_charge)
        .toFixed(2)
    );

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total_amount * 100),
      currency: "INR",
      receipt: "RCPT-" + Date.now(),
      notes: {
        customer_email: customer_details.email,
        customer_name: customer_details.name
      }
    });

    const orderID = "ORD-" + Date.now();

    const newOrder = await Order.create({
      customer,
      customer_details,
      items: populatedItems,
      shipping_address,
      notes,
      coupon_id,
      orderID,
      payment: {
        product_total,
        shipping_charge,
        total_amount,
        discount_amount,
        coupon_discount_amount,
        payment_details: {
          razorpay_order_id: razorpayOrder.id,
          razorpay_amount: razorpayOrder.amount,
          status: "created",
        },
        payment_method: "Online",
        payment_status: "Pending",
      },
    });

    await sendPlacedOrderMail({
      email: customer_details.email,
      order: newOrder,
      items: populatedItems,
      razorpayOrder
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Order placed successfully",
      razorpayOrder,
      data: newOrder,
    });

  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.verifyPaymentStatus = async (req, res, next) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      order_id,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    const order = await Order.findById(order_id);
    if (!order) {
      return next(new ErrorHandler("Order not found", StatusCodes.NOT_FOUND));
    }

    if (isValid) {
      order.payment.payment_status = "Paid";
      order.payment.payment_details = {
        ...order.payment.payment_details,
        razorpay_payment_id,
        razorpay_signature,
        status: "paid",
      };
      order.order_status = "processing";

      await order.save();

      // await sendOrderMail(
      //   order.customer_details.email,
      //   order.orderID,
      //   order.items,
      //   order.payment.total_amount
      // )

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Payment verified successfully",
        data: order,
      });
    } else {
      return next(
        new ErrorHandler("Payment verification failed", StatusCodes.BAD_REQUEST)
      );
    }
  } catch (error) {
    return next(new ErrorHandler(error, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_details } = req.body;

    const order = await Order.findById(id).populate("items.product");
    if (!order)
      return next(new ErrorHandler("Order not found", StatusCodes.NOT_FOUND));

    if (payment_status) order.payment.payment_status = payment_status;

    if (payment_details) {
      order.payment.payment_details = {
        ...order.payment.payment_details,
        ...payment_details,
      };
    }

    if (payment_status === "Paid") {
      order.order_status = "processing";

      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { qty: -item.quantity } },
          { new: true }
        );
      }

      const couponId = order.coupon_id;
      if (couponId) {
        const coupon = await Coupon.findById(couponId);

        if (coupon) {
          const alreadyExists = coupon.orderIds.includes(order._id);

          if (!alreadyExists) {
            coupon.orderIds.push(order._id);
            coupon.usageCount += 1;
            await coupon.save();
          }
        }
      }

      await sendPaymentStatusMail({
        email: order.customer_details.email,
        name: order.customer_details.name,
        order,
      });
    }

    await order.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Payment status updated successfully",
      data: order,
    });

  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.getCustomerAllOrders = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    let { page = 1, perPage = 10 } = req.query;

    page = parseInt(page);
    perPage = parseInt(perPage);

    if (!customerId) {
      return next(
        new ErrorHandler("Customer ID is required", StatusCodes.BAD_REQUEST)
      );
    }

    const totalCount = await Order.countDocuments({ customer: customerId });

    const orders = await Order.find({ customer: customerId })
      .select(
        "_id orderID createdAt order_status payment items shipment shipping_address customer"
      )
      .populate({
        path: "items.product",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const formattedOrders = orders.map((order) => {
      const products = order.items.map((item) => ({
        name: item.product?.name || "Unknown",
        quantity: item.quantity,
        price: `₹${item.price?.item_price || 0}`,
      }));

      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const shipping = order.shipping_address;
      const shippingAddress = `${shipping.address_line_1}, ${shipping.address_line_2}, ${shipping.city}, ${shipping.state} - ${shipping.pincode}`;

      return {
        _id: order._id,
        customer: order.customer,
        order_id: `#${order.orderID}`,
        date: new Date(order.createdAt).toISOString().split("T")[0],
        status: order.order_status,
        total: `₹${order.payment.total_amount}`,
        items: totalItems,
        products,
        shippingAddress,
        trackingNumber: order.shipment?.tracking_Id || "N/A",
        trackingUrl: order.shipment?.tracking_url || null,
        payment_status: order.payment.payment_status,
        payment_details: order.payment.payment_details || {},
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders,
      pagination: {
        total_items: totalCount,
        total_pages: Math.ceil(totalCount / perPage),
        current_page_item: formattedOrders.length,
        page_no: page,
        items_per_page: perPage,
      },
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.getCustomerOrderById = async (req, res, next) => {
  try {
    const { customerId, orderId } = req.params;

    if (!customerId || !orderId) {
      return next(
        new ErrorHandler(
          "Customer ID and Order ID are required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const order = await Order.findOne({ _id: orderId, customer: customerId })
      // .populate("customer", "-password")
      .populate("items.product")
      .lean();

    if (!order) {
      return next(
        new ErrorHandler(
          "Order not found for this customer",
          StatusCodes.NOT_FOUND
        )
      );
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.validateCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return next(new ErrorHandler("Coupon code is required", StatusCodes.BAD_REQUEST));
    }

    const coupon = await CouponModel.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    if (coupon.status !== "active") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Coupon is inactive",
      });
    }

    if (!coupon.noExpiry && coupon.expiryDate) {
      const now = new Date();
      if (now > coupon.expiryDate) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Coupon has expired",
        });
      }
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Coupon is valid",
      data: {
        code: coupon.code,
        discountPercentage: coupon.percentage,
        note: coupon.note,
        expiryDate: coupon.noExpiry ? null : coupon.expiryDate,
        noExpiry: coupon.noExpiry,
        _id: coupon._id
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Error validating coupon", StatusCodes.INTERNAL_SERVER_ERROR));
  }
};