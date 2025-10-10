const senEmail = require("../utils/sendMail");
const { ErrorHandler } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const Product = require("../models/productModel");

const sendCustomEmail = async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    await senEmail.OTPEmail(email, subject, message);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending failed:", error);
    return next(
      new ErrorHandler("Email sending failed", StatusCodes.BAD_REQUEST)
    );
  }
};

const sendOrderMail = async (email, orderID, items, totalAmount) => {
  // 🔹 Fetch product names
  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select("name _id");

  // 🔹 Build HTML rows for each item
  const itemRows = items
    .map((item) => {
      const product = products.find((p) => p._id.toString() === item.product);
      return `
          <tr style="text-align:center;">
            <td style="padding:8px; border:1px solid #ddd;">${product ? product.name : "Unknown Product"}</td>
            <td style="padding:8px; border:1px solid #ddd;">${item.sku || "-"}</td>
            <td style="padding:8px; border:1px solid #ddd;">
              ${item.size?.package_weight || "-"} / ${item.size?.number_of_piecces || "-"}
            </td>
            <td style="padding:8px; border:1px solid #ddd;">${item.quantity}</td>
            <td style="padding:8px; border:1px solid #ddd;">₹${item.price?.item_price || 0}</td>
            <td style="padding:8px; border:1px solid #ddd;">₹${item.price?.total_price || 0}</td>
          </tr>
        `;
    })
    .join("");

  // 🔹 Full email HTML
  const html = `
      <div style="font-family:Arial, sans-serif; color:#333;">
        <h2 style="color:#2d2d2d;">Thank You for Your Order! 🛍️</h2>
        <p>Hi there,</p>
        <p>We’re happy to confirm your order <strong>#${orderID}</strong>. Here are your order details:</p>
        
        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
          <thead style="background:#f5f5f5;">
            <tr style="text-align:center;">
              <th style="padding:8px; border:1px solid #ddd;">Product</th>
              <th style="padding:8px; border:1px solid #ddd;">SKU</th>
              <th style="padding:8px; border:1px solid #ddd;">Size</th>
              <th style="padding:8px; border:1px solid #ddd;">Qty</th>
              <th style="padding:8px; border:1px solid #ddd;">Price</th>
              <th style="padding:8px; border:1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <p style="margin-top:20px; font-size:16px;">
          <strong>Total Amount:</strong> ₹${totalAmount}
        </p>

        <p style="margin-top:30px;">We'll notify you once your order is shipped.</p>
        <p style="color:#666;">Thank you for shopping with us ❤️</p>

        <hr/>
        <p style="font-size:12px; color:#999;">This is an automated message. Please do not reply.</p>
      </div>
    `;

  await senEmail.OTPEmail(email, `Order Confirmation - ${orderID}`, html);
  await senEmail.OTPEmail("noreply.nutrajun@gmail.com", `New Order - ${orderID}`, html);

};

// const sendOrderMail = async (to, orderID, items, totalAmount) => {
//   const itemsHtml = items
//     .map(
//       (item) =>
//         `<li>${item.product.name} - Qty: ${item.quantity} - ₹${item.price.total_price}</li>`
//     )
//     .join("");

//   const html = `
//     <h3>Thank you for your order!</h3>
//     <p>Your order <strong>#${orderID}</strong> has been placed successfully.</p>
//     <p><strong>Order Summary:</strong></p>
//     <ul>${itemsHtml}</ul>
//     <p><strong>Total:</strong> ₹${totalAmount}</p>
//     <p>We will notify you once your order is shipped.</p>
//   `;

//   await senEmail.OTPEmail(to, `Order Confirmation - ${orderID}`, html);
//   await senEmail.OTPEmail("noreply.nutrajun@gmail.com", `New Order - ${orderID}`, html);
// };

module.exports = { sendCustomEmail, sendOrderMail };
