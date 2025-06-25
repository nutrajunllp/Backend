const senEmail = require("../utils/sendMail");
const { ErrorHandler } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");

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

const sendOrderMail = async (to, orderID, items, totalAmount) => {
  const itemsHtml = items
    .map(
      (item) =>
        `<li>${item.product.name} - Qty: ${item.quantity} - ₹${item.price.total_price}</li>`
    )
    .join("");

  const html = `
    <h3>Thank you for your order!</h3>
    <p>Your order <strong>#${orderID}</strong> has been placed successfully.</p>
    <p><strong>Order Summary:</strong></p>
    <ul>${itemsHtml}</ul>
    <p><strong>Total:</strong> ₹${totalAmount}</p>
    <p>We will notify you once your order is shipped.</p>
  `;

  await senEmail.OTPEmail(to, `Order Confirmation - ${orderID}`, html);
};

module.exports = { sendCustomEmail, sendOrderMail };
