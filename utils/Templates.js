module.exports = function generateInvoiceHTML(order) {
  const {
    _id,
    orderID,
    createdAt,
    items,
    payment,
    shipping_address,
    customer_details
  } = order;

  const productRows = items.map((item, index) => `
    <tr>
      <td>${item.product?.name || 'N/A'}</td>
      <td class="text-center">₹${item.price?.item_price.toFixed(2)}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">₹${(item.price?.item_price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  const tax = (payment.total_amount * 0.05).toFixed(2); // 5% tax example

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Invoice</title>
    <link href="https://netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.min.css" rel="stylesheet">
    <style>
      .invoice-title h2, .invoice-title h3 {
        display: inline-block;
      }
      .table > tbody > tr > .no-line {
        border-top: none;
      }
      .table > thead > tr > .no-line {
        border-bottom: none;
      }
      .table > tbody > tr > .thick-line {
        border-top: 2px solid;
      }
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
                          ${customer_details?.name || ''}<br>
                          ${shipping_address?.address_line_1 || ''}<br>
                          ${shipping_address?.address_line_2 || ''}<br>
                          ${shipping_address?.city || ''}, ${shipping_address?.state || ''} - ${shipping_address?.pincode || ''}
                      </address>
                  </div>
                  <div class="col-xs-6 text-right">
                      <address>
                      <strong>Shipped To:</strong><br>
                          ${customer_details?.name || ''}<br>
                          ${shipping_address?.address_line_1 || ''}<br>
                          ${shipping_address?.address_line_2 || ''}<br>
                          ${shipping_address?.city || ''}, ${shipping_address?.state || ''} - ${shipping_address?.pincode || ''}
                      </address>
                  </div>
              </div>
              <div class="row">
                  <div class="col-xs-6">
                      <address>
                          <strong>Payment Method:</strong><br>
                          ${payment?.method || 'N/A'}<br>
                          ${customer_details?.email || ''}
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
                                      <td class="thick-line text-right">₹${payment.product_total.toFixed(2)}</td>
                                  </tr>
                                  <tr>
                                      <td class="no-line"></td>
                                      <td class="no-line"></td>
                                      <td class="no-line text-center"><strong>Shipping</strong></td>
                                      <td class="no-line text-right">₹${payment.shipping_charge.toFixed(2)}</td>
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
                                      <td class="no-line text-right"><strong>₹${payment.total_amount.toFixed(2)}</strong></td>
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
  </html>
  `;
};

module.exports.generateLabelHTML = (order, barcodeBase64) => {
  const {
    _id,
    orderID,
    customer_details,
    shipping_address,
    shipment
  } = order;

  return `
    <html>
    <head>
      <style>
        body {
          width: 4in;
          height: 6in;
          margin: 0;
          padding: 10px;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        .label {
          border: 1px solid #000;
          padding: 10px;
          height: 100%;
        }
        .company {
          text-align: center;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 10px;
        }
        .barcode {
          text-align: center;
          margin-top: 20px;
        }
        img.barcode {
          width: 180px;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="company">
          NutraJun LLP<br>
          51, 3rd Floor, Harirambapa Society,<br>
          Surat, Gujarat 395006<br>
          Contact: contact@nutrajun.com
        </div>

        <div class="section">
          <strong>Order ID:</strong> ${orderID || _id}<br>
          <strong>Weight:</strong> ${shipment?.weight || 'N/A'} KG
        </div>

        <div class="section">
          <strong>To:</strong><br>
          ${customer_details?.name || 'N/A'}<br>
          ${customer_details?.phone || ''}<br>
          ${shipping_address?.address_line || ''}<br>
          ${shipping_address?.city || ''}, ${shipping_address?.state || ''} - ${shipping_address?.pincode || ''}
        </div>

        <div class="barcode">
          <img class="barcode" src="${barcodeBase64}" alt="barcode" />
        </div>
      </div>
    </body>
    </html>
  `;
};