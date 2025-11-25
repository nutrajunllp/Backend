const sendEmail = require("../utils/sendMail");
const { ErrorHandler } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const Product = require("../models/productModel");

const sendCustomEmail = async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    await sendEmail.OTPEmail(email, subject, message);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending failed:", error);
    return next(
      new ErrorHandler("Email sending failed", StatusCodes.BAD_REQUEST)
    );
  }
};

const sendPlacedOrderMail = async ({ email, order }) => {
  const items = order.items || [];

  const itemRows = items.map(item => `
    <tr style="text-align:center;">
          <td style="padding:8px; border:1px solid #ddd;">
            <img src="${item?.image_url || ""}"
              style="width:60px;height:60px;object-fit:cover;border-radius:4px;" /><br>
            ${item?.name || "Unknown Product"}
          </td>
          <td style="padding:8px; border:1px solid #ddd;">${item.sku || "-"}</td>
          <td style="padding:8px; border:1px solid #ddd;">${item.quantity}</td>
          <td style="padding:8px; border:1px solid #ddd;">₹${item.price.item_price}</td>
          <td style="padding:8px; border:1px solid #ddd;">₹${item.price.total_price}</td>
        </tr>
  `).join("");

  const viewOrderURL = `https://www.nutrajun.com/order/${order._id}`;

  const html = `
  <div style="font-family:Arial, sans-serif; max-width:650px; margin:auto; padding:20px; background:#ffffff; border-radius:8px; border:1px solid #eee;">
    
    <h2 style="text-align:center; color:#222;">Order Placed Successfully</h2>
    <p style="font-size:15px; color:#444;">Hi <strong>${order.customer_details.name}</strong>,</p>
    <p style="font-size:14px; color:#444;">Thank you for shopping with us! Your order <strong>#${order.orderID}</strong> has been placed and is currently <strong style="color:#d9534f;">Pending Payment</strong>.</p>
    
    <hr style="margin:20px 0; border:none; border-top:1px solid #eee;">

    <h3 style="color:#222;">Order Items</h3>

    <table style="width:100%; border-collapse:collapse;margin-top:20px;">
      <thead><tr>
        <th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="margin-top:20px; font-size:15px;">
      <p><strong>Subtotal:</strong> ₹${order.payment.product_total}</p>
      <p><strong>Discount:</strong> ₹${order.payment.discount_amount}</p>
      <p><strong>Coupon Discount:</strong> ₹${order.payment.coupon_discount_amount}</p>
      <p><strong>Shipping:</strong> ₹${order.payment.shipping_charge}</p>
      <h2 style="margin-top:10px;">Final Amount: ₹${order.payment.total_amount}</h2>
    </div>

    <hr style="margin:20px 0; border:none; border-top:1px solid #eee;">

    <p style="font-size:16px;"><strong>Payment Status:</strong> <span style="color:#d9534f;">Pending</span></p>

    <div style="text-align:center; margin-top:25px;">
      <a href="${viewOrderURL}" 
        style="background:#3A6AFF; color:white; padding:12px 20px; border-radius:6px; text-decoration:none; font-size:16px;">
        View Order
      </a>
    </div>

    <p style="margin-top:30px; font-size:12px; color:#888; text-align:center;">
      © ${new Date().getFullYear()} Nutrajun. All rights reserved.
    </p>

  </div>
  `;

  await sendEmail.ORDEREmail(email, `Order Placed - ${order.orderID}`, html);
};

const sendPaymentStatusMail = async ({ email, name, order }) => {
  const itemsHtml = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px;">
          <img src="${i.image_url}" width="70" style="border-radius:6px;" />
        </td>
        <td style="padding:10px;">${i.name}</td>
        <td style="padding:10px;">${i.quantity}</td>
        <td style="padding:10px;">₹${i.price.total_price}</td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="background:#f6fff6;padding:25px;border-radius:10px;font-family:sans-serif;">
    <h2 style="color:#0f8a29;">Payment Successful</h2>
    <p>Hello <b>${name}</b>,</p>
    <p>Your payment has been confirmed for the order.</p>

    <div style="padding:15px;background:#e8ffe8;border-left:5px solid #0f8a29;margin:15px 0;">
      <p><b>Order ID:</b> ${order.orderID}</p>
      <p><b>Total Amount:</b> ₹${order.payment.total_amount}</p>
      <p><b>Status:</b> Paid</p>
    </div>

    <h3 style="color:#0f8a29;">Order Items</h3>
    <table border="1" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr style="background:#dafbda;">
        <th>Image</th>
        <th>Product</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
      ${itemsHtml}
    </table>

    <p style="margin-top:20px;">Thank you for shopping with us!</p>
  </div>`;

  await sendEmail({
    to: email,
    subject: `Payment Successful - Order ${order.orderID}`,
    html,
  });
};

module.exports = { sendCustomEmail, sendPlacedOrderMail, sendPaymentStatusMail };