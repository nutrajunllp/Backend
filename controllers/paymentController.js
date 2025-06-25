const { StatusCodes } = require("http-status-codes");
const razorpay = require("../utils/razorpayClient");
const ErrorHandler = require("../middleware/errorHandler");
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf");
const { PDFDocument } = require("pdf-lib");

module.exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) {
      return next(
        new ErrorHandler("Payment ID is required", StatusCodes.BAD_REQUEST)
      );
    }

    const paymentLinkDetails = await razorpay.payments.fetch(payment_id);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Payment status fetched successfully",
      data: paymentLinkDetails,
    });
  } catch (error) {
    next(
      new ErrorHandler(
        error.error.description,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

module.exports.generateInvoicePDF = (order, callback) => {
  const {
    _id,
    orderID,
    createdAt,
    items,
    payment,
    shipping_address,
    customer_details,
  } = order;

  const productRows = items
    .map(
      (item) => `
      <tr>
        <td>${item.product?.name || "N/A"}</td>
        <td class="text-center">₹${item.price?.item_price.toFixed(2)}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">₹${(
          item.price?.item_price * item.quantity
        ).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const tax = (payment.total_amount * 0.05).toFixed(2); // 5% tax

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Invoice</title>
    <link href="https://netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.min.css" rel="stylesheet">
    <style>
      .invoice-title h2, .invoice-title h3 { display: inline-block; }
      .table > tbody > tr > .no-line { border-top: none; }
      .table > thead > tr > .no-line { border-bottom: none; }
      .table > tbody > tr > .thick-line { border-top: 2px solid; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="row">
        <div class="col-xs-12">
          <div class="invoice-title">
            <h2>Invoice</h2><h3 class="pull-right">Order # ${orderID}</h3>
          </div>
          <hr>
          <div class="row">
            <div class="col-xs-6">
              <address>
                <strong>Billed To:</strong><br>
                ${customer_details?.name || ""}<br>
                ${shipping_address?.address_line_1 || ""}<br>
                ${shipping_address?.address_line_2 || ""}<br>
                ${shipping_address?.city || ""}, ${
    shipping_address?.state || ""
  } - ${shipping_address?.pincode || ""}
              </address>
            </div>
            <div class="col-xs-6 text-right">
              <address>
                <strong>Shipped To:</strong><br>
                ${customer_details?.name || ""}<br>
                ${shipping_address?.address_line_1 || ""}<br>
                ${shipping_address?.address_line_2 || ""}<br>
                ${shipping_address?.city || ""}, ${
    shipping_address?.state || ""
  } - ${shipping_address?.pincode || ""}
              </address>
            </div>
          </div>
          <div class="row">
            <div class="col-xs-6">
              <address>
                <strong>Payment Method:</strong><br>
               Method : ${payment?.payment_method || "N/A"}<br>
               Status : ${payment?.payment_status || "N/A"}<br>
               PaymentId : ${
                 payment?.payment_details.razorpay_payment_id || "N/A"
               }<br>
               email : ${customer_details?.email || ""}
              </address>
            </div>
            <div class="col-xs-6 text-right">
              <address>
                <strong>Order Date:</strong><br>
                ${new Date(createdAt).toLocaleDateString()}<br><br>
                <strong>Order MongoID:</strong><br>
                ${_id}
              </address>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-12">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title"><strong>Order summary</strong></h3>
            </div>
            <div class="panel-body">
              <div class="table-responsive">
                <table class="table table-condensed">
                  <thead>
                    <tr>
                      <td><strong>Item</strong></td>
                      <td class="text-center"><strong>Price</strong></td>
                      <td class="text-center"><strong>Quantity</strong></td>
                      <td class="text-right"><strong>Totals</strong></td>
                    </tr>
                  </thead>
                  <tbody>
                    ${productRows}
                    <tr>
                      <td class="thick-line"></td>
                      <td class="thick-line"></td>
                      <td class="thick-line text-center"><strong>Subtotal</strong></td>
                      <td class="thick-line text-right">₹${payment.product_total.toFixed(
                        2
                      )}</td>
                    </tr>
                    <tr>
                      <td class="no-line"></td>
                      <td class="no-line"></td>
                      <td class="no-line text-center"><strong>Shipping</strong></td>
                      <td class="no-line text-right">₹${payment.shipping_charge.toFixed(
                        2
                      )}</td>
                    </tr>
                    <tr>
                      <td class="no-line"></td>
                      <td class="no-line"></td>
                      <td class="no-line text-center"><strong>Tax</strong></td>
                      <td class="no-line text-right">₹${tax}</td>
                    </tr>
                    <tr>
                      <td class="no-line"></td>
                      <td class="no-line"></td>
                      <td class="no-line text-center"><strong>Total</strong></td>
                      <td class="no-line text-right"><strong>₹${payment.total_amount.toFixed(
                        2
                      )}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="text-center" style="margin-top: 20px;">Generated on ${new Date().toLocaleString()}</p>
    </div>
  </body>
  </html>`;

  const filePath = path.join(
    __dirname,
    "../invoices",
    `invoice-${orderID}.pdf`
  );
  pdf.create(htmlContent).toFile(filePath, (err, res) => {
    if (err) return callback(err);
    callback(null, res.filename); // return the path to the generated PDF
  });
};

// const companyDetails = {
//   name: "Nutrajun LLP",
//   address:
//     "51, 3rd Floor, Harirambapa Society Near Surat Super Store, Baroda Prestige Varachha Main Road, Surat – 395006, Gujarat, INDIA.",
//   contact: "Contact@nutrajun.com",
// };

// module.exports.generateLabelHTML = (order) => {
//   const { orderID, shipping_address, customer } = order;

//   const labelDetails = {
//     weight: "1.5KG",
//     reference: `PO${orderID}`,
//     deliveryInstruction: "Please leave with reception",
//   };

//   return `
//     <div class="label-box">
//       <div class="sender">
//         <h3>Sender:</h3>
//         <p><strong>${companyDetails.name}</strong></p>
//         <p>${companyDetails.address}</p>
//         <p>Tel: ${companyDetails.contact}</p>
//       </div>
//       <div class="receiver">
//         <h3>To:</h3>
//         <p><strong>${customer?.name || "N/A"}</strong></p>
//         <p>${customer?.mobile_number || "N/A"}</p>
//         <p>${shipping_address?.type || ""}, ${shipping_address?.address_line_1 || ""}, ${shipping_address?.address_line_2 || ""}</p>
//         <p>${shipping_address?.city || ""}, ${shipping_address?.state || ""}, ${shipping_address?.country || ""}</p>
//         <p>${shipping_address?.pincode || ""}</p>
//       </div>
//       <div class="details-grid">
//         <div>
//           <p><strong>Order No:</strong> ${orderID}</p>
//           <p><strong>Reference:</strong> ${labelDetails.reference}</p>
//           <p><strong>Weight:</strong> ${labelDetails.weight}</p>
//         </div>
//         <div class="logo">LOGO</div>
//       </div>
//       <div class="instruction">
//         <strong>Delivery Instruction:</strong> ${labelDetails.deliveryInstruction}
//       </div>
//     </div>
//   `;
// };