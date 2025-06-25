const transporter = require("../config/emailConfig");

/**
 * Function to send an email
 * @param {string} email - Recipient's email
 * @param {string} subject - Email subject
 * @param {string} message - Email content (HTML)
 */
//otp mail
module.exports.OTPEmail = async (email, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports.ORDEREmail = async (email, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: message,
  };

  await transporter.sendMail(mailOptions);
};