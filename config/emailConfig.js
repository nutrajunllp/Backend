const nodemailer = require("nodemailer");

module.exports.transporterOTP = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "noreply.nutrajun@gmail.com", 
    pass: "drkb xxmv ipbb fota", 
  },
});

module.exports.transporterORDER = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "noreply.nutrajun@gmail.com", 
    pass: "drkb xxmv ipbb fota", 
  },
});
