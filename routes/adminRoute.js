const express = require("express");
const router = express.Router();
const path = require("path");
const pdf = require("html-pdf");
const bwipjs = require("bwip-js"); // for barcode generation
const fs = require("fs");
const adminAuthController = require("../controllers/admin/adminAuthController");
const adminProductController = require("../controllers/admin/productController");
const adminCategoryController = require("../controllers/admin/categoryController");
const adminOrderController = require("../controllers/admin/orderController");
const adminCustomerController = require("../controllers/admin/userController");
const adminDashboardController = require("../controllers/admin/dashboardController");
const adminBlogController = require("../controllers/admin/blogController");
const adminCouponController = require("../controllers/admin/couponController");
const adminContactUsController = require("../controllers/admin/contactController");
const galleryController = require("../controllers/admin/galleryController");

const { protectRoute, allowAccess } = require("../middleware/auth");
const { uploadFile } = require("../middleware/multer-s3-upload");
const orderModel = require("../models/orderModel");

const uploadProductPhotos = uploadFile("product").array("images");
const uploadProductFiles = uploadFile("products").fields([
  { name: "main_image", maxCount: 1 },
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 3 },
]);

const uploadCategoryBanner = uploadFile("category-banner").single("image");
const uploadOrderPhoto = uploadFile("order-photo").single("image");
const uploadBlogPhotos = uploadFile("blog-photo").any();

const uploadGalleryImage = uploadFile("gallery").single("image");

//Auth
router.post("/admin/auth/send-otp", adminAuthController.sendAdminLoginOTP);
router.post("/admin/auth/login", adminAuthController.loginAdmin);

//Product 
router.post("/admin/product/create", protectRoute, allowAccess(["admin"]), uploadProductFiles, adminProductController.createProduct)
router.get("/admin/product/all", protectRoute, allowAccess(["admin"]), adminProductController.getAllProducts)
router.get("/admin/product/one/:productId", protectRoute, allowAccess(["admin"]), adminProductController.getProductById);
router.put("/admin/product/edit/:productId", protectRoute, allowAccess(["admin"]), uploadProductFiles, adminProductController.editProduct)
router.delete("/admin/product/delete-images/:productId", protectRoute, allowAccess(["admin"]), adminProductController.deleteProductImages)
router.delete("/admin/product/delete/:productId", protectRoute, allowAccess(["admin"]), adminProductController.deleteProduct)
router.delete("/admin/product/review/:productId/:reviewId", protectRoute, allowAccess(["admin"]), adminProductController.deleteReview);
// router.delete("/admin/product/deletes", protectRoute, allowAccess(["admin"]), adminProductController.deleteMultipleProducts)

//Category
router.post("/admin/category/create", protectRoute, allowAccess(["admin"]), uploadCategoryBanner, adminCategoryController.createCategory)
router.get("/admin/category/all", protectRoute, allowAccess(["admin"]), adminCategoryController.getAllCategories)
router.get("/admin/category/one/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.getCategoryById)
router.put("/admin/category/edit/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.editCategory)
router.delete("/admin/category/delete/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.deleteCategory)

//Order
router.get("/admin/order/all", protectRoute, allowAccess(["admin"]), adminOrderController.getAllOrders);
router.get("/admin/order/one/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.getOrderById);
router.patch("/admin/order/update_status/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.updateOrderStatus);
router.patch("/admin/order/update_shipment/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.updateShipment);
router.post("/admin/order/download-excel", protectRoute, allowAccess(["admin"]), adminOrderController.downloadOrderExcel);

//customer
router.get("/admin/customer/all", protectRoute, allowAccess(["admin"]), adminCustomerController.getAllCustomersPaginated);
router.patch("/admin/customer/update-status/:_id", protectRoute, allowAccess(["admin"]), adminCustomerController.updateCustomerStatus);

//Admin Dashboard
router.get("/admin/dashboard/summary", protectRoute, allowAccess(["admin"]), adminDashboardController.getAdminDashboardCounts);
router.get("/admin/dashboard/chart", protectRoute, allowAccess(["admin"]), adminDashboardController.getDashboardChart);
router.get("/admin/dashboard/order-summary", protectRoute, allowAccess(["admin"]), adminDashboardController.getOrderSummary);
router.get("/admin/dashboard/today-orders", protectRoute, allowAccess(["admin"]), adminDashboardController.getTodayOrders);
router.get("/admin/dashboard/coupon-orders", adminDashboardController.getAllCouponsAnalytics);

//Blog
router.post("/admin/blog/create", protectRoute, allowAccess(["admin"]), uploadBlogPhotos, adminBlogController.createBlog)
router.get("/admin/blog/all", protectRoute, allowAccess(["admin"]), adminBlogController.getBlogs)
router.get("/admin/blog/one/:id", protectRoute, allowAccess(["admin"]), adminBlogController.getBlog)
router.put("/admin/blog/edit/:id", protectRoute, allowAccess(["admin"]), uploadBlogPhotos, adminBlogController.updateBlog)
router.delete("/admin/blog/delete/:id", protectRoute, allowAccess(["admin"]), adminBlogController.deleteBlog)

//Coupon
router.post("/admin/coupon/create", protectRoute, allowAccess(["admin"]), adminCouponController.createCoupon)
router.get("/admin/coupon/all", protectRoute, allowAccess(["admin"]), adminCouponController.getAllCoupons)
router.get("/admin/coupon/analytics/:id", adminCouponController.getCouponAnalyticsById)
router.get("/admin/coupon/one/:id", protectRoute, allowAccess(["admin"]), adminCouponController.getCouponById)
router.get("/admin/coupon/update/:id", protectRoute, allowAccess(["admin"]), adminCouponController.updateCoupon)
router.delete("/admin/coupon/delete/:id", protectRoute, allowAccess(["admin"]), adminCouponController.deleteCoupon)

// contact Us
router.get("/admin/contact/all", protectRoute, allowAccess(["admin"]), adminContactUsController.getAllContacts);
router.get("/admin/contact/one/:contactId", protectRoute, allowAccess(["admin"]), adminContactUsController.getSingleContact);
router.delete("/admin/contact/delete", protectRoute, allowAccess(["admin"]), adminContactUsController.deleteMultipleContacts);

//Gallery
router.post("/admin/gallery/create", protectRoute, allowAccess(["admin"]), uploadGalleryImage, galleryController.createGalleryImage);
router.get("/admin/gallery", protectRoute, allowAccess(["admin"]), galleryController.getAllGalleryImages);
router.delete("/admin/gallery/delete/:id", protectRoute, allowAccess(["admin"]), galleryController.deleteGalleryImage);
router.put("/admin/gallery/edit/:id", protectRoute, allowAccess(["admin"]), uploadGalleryImage, galleryController.editGalleryImage);

// POST: Generate Shipping Label
router.post("/admin/order/label/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tracking_Id, delivery_partner, weight } = req.body;

    const order = await orderModel.findById(orderId).populate("items.product").lean();
    if (!order) return res.status(404).json({ message: "Order not found." });

    // update shipment details
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "shipment.tracking_Id": tracking_Id,
          "shipment.delivery_partner": delivery_partner,
          "shipment.shipment_status": "shipped",
          label_create: 1,
          "shipment.weight": weight || "—",
        },
      },
      { new: true }
    ).lean();

    // Generate smaller barcode
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: updatedOrder._id.toString(),
      scale: 2, // smaller scale
      height: 8, // smaller height
      includetext: false,
    });
    const barcodeBase64 = `data:image/png;base64,${barcodeBuffer.toString("base64")}`;

    // Generate label HTML (4x6 inches)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Shipping Label</title>
        <style>
          @page { size: 4in 6in; margin: 0; }
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
            font-size: 13px;
            line-height: 1.4;
          }
          .label-box {
            border: 1px solid #000;
            height: 100%;
            padding: 12px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
          }
          .company-info {
            font-size: 12px;
            line-height: 1.3;
          }
          .section {
            margin-top: 10px;
          }
          .section-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 13px;
            margin-bottom: 4px;
          }
          ul { margin: 0; padding-left: 15px; }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .barcode {
            text-align: center;
            margin-top: 6px;
          }
          .barcode img {
            width: 80%;
            height: auto;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            margin-top: 6px;
            border-top: 1px solid #000;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="label-box">
          <!-- FROM COMPANY INFO -->
          <div class="header">
            <div class="section-title">FROM:</div>
            <div class="company-info">
              <strong>Shiny Story Jewellers</strong><br>
              Surat, Gujarat, India<br>
              📞 +91 99999 99999<br>
              ✉️ support@shinystory.in
            </div>
          </div>

          <!-- TO CUSTOMER -->
          <div class="section">
            <div class="section-title">TO:</div>
            <p>
              <strong>${updatedOrder.customer_details.name}</strong><br>
              ${updatedOrder.shipping_address.address_line_1},<br>
              ${updatedOrder.shipping_address.address_line_2},<br>
              ${updatedOrder.shipping_address.city}, ${updatedOrder.shipping_address.state} - ${updatedOrder.shipping_address.pincode}<br>
              📞 ${updatedOrder.customer_details.phone}
            </p>
          </div>

          <div class="divider"></div>

          <!-- DELIVERY PARTNER -->
          <div class="section">
            <div class="section-title">Delivery Partner:</div>
            <p>${delivery_partner}</p>
          </div>

          <!-- TRACKING ID -->
          <div class="section">
            <div class="section-title">Tracking ID:</div>
            <p>${tracking_Id}</p>
          </div>

          <!-- ORDER DETAILS -->
          <div class="section">
            <p><strong>Weight:</strong> ${weight || "—"} kg</p>
          </div>

          <!-- BARCODE -->
          <div class="barcode">
            <img src="${barcodeBase64}" alt="Order Barcode" />
          </div>

          <div class="footer">
            Thank you for shopping with <strong>Shiny Story Jewellers</strong> 💎
          </div>
        </div>
      </body>
      </html>
    `;

    const folderPath = path.join(__dirname, "../labels");
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

    const filePath = path.join(folderPath, `label-${updatedOrder.orderID}.pdf`);

    pdf.create(htmlContent, {
      width: "4in",
      height: "6in",
      border: "0",
    }).toFile(filePath, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error generating label." });
      }
      return res.download(result.filename);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
});


module.exports = router