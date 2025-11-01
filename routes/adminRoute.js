const express = require("express");
const router = express.Router();
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
router.post("/admin/auth/register", adminAuthController.registerAdmin);
router.post("/admin/auth/login", adminAuthController.loginAdmin);

//Product 
router.post("/admin/product/create", protectRoute, allowAccess(["admin"]), uploadProductFiles, adminProductController.createProduct)
router.get("/admin/product/all", protectRoute, allowAccess(["admin"]), adminProductController.getAllProducts)
router.get("/admin/product/one/:productId", protectRoute, allowAccess(["admin"]), adminProductController.getProductById);
router.put("/admin/product/edit/:productId", protectRoute, allowAccess(["admin"]), uploadProductFiles, adminProductController.editProduct)
router.delete("/admin/product/delete-images/:productId", protectRoute, allowAccess(["admin"]), adminProductController.deleteProductImages)
// router.delete("/admin/product/delete/:productId", protectRoute, allowAccess(["admin"]), adminProductController.deleteProduct)
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
router.post("/admin/order/generate-labels", adminOrderController.generateShippingLabelPDF);

//customer
router.get("/admin/customer/all", protectRoute, allowAccess(["admin"]), adminCustomerController.getAllCustomersPaginated);
router.patch("/admin/customer/update-status/:_id", protectRoute, allowAccess(["admin"]), adminCustomerController.updateCustomerStatus);

//Admin Dashboard
router.get("/admin/dashboard/summary", protectRoute, allowAccess(["admin"]), adminDashboardController.getAdminDashboardCounts);
router.get("/admin/dashboard/chart", protectRoute, allowAccess(["admin"]), adminDashboardController.getDashboardChart);
router.get("/admin/dashboard/order-summary", protectRoute, allowAccess(["admin"]), adminDashboardController.getOrderSummary);
router.get("/admin/dashboard/today-orders", protectRoute, allowAccess(["admin"]), adminDashboardController.getTodayOrders);

//Blog
router.post("/admin/blog/create", protectRoute, allowAccess(["admin"]), uploadBlogPhotos, adminBlogController.createBlog)
router.get("/admin/blog/all", protectRoute, allowAccess(["admin"]), adminBlogController.getBlogs)
router.get("/admin/blog/one/:id", protectRoute, allowAccess(["admin"]), adminBlogController.getBlog)
router.put("/admin/blog/edit/:id", protectRoute, allowAccess(["admin"]), uploadBlogPhotos, adminBlogController.updateBlog)
router.delete("/admin/blog/delete/:id", protectRoute, allowAccess(["admin"]), adminBlogController.deleteBlog)

//Coupon
router.post("/admin/coupon/create", protectRoute, allowAccess(["admin"]), adminCouponController.createCoupon)
router.get("/admin/coupon/all", protectRoute, allowAccess(["admin"]), adminCouponController.getAllCoupons)
router.get("/admin/coupon/one/:id", protectRoute, allowAccess(["admin"]), adminCouponController.getCouponById)
router.get("/admin/coupon/update/:id", protectRoute, allowAccess(["admin"]), adminCouponController.updateCoupon)

// contact Us
router.get("/admin/contact/all", protectRoute, allowAccess(["admin"]), adminContactUsController.getAllContacts);
router.get("/admin/contact/one/:contactId", protectRoute, allowAccess(["admin"]), adminContactUsController.getSingleContact);
router.delete("/admin/contact/delete", protectRoute, allowAccess(["admin"]), adminContactUsController.deleteMultipleContacts);

//Gallery
router.post("/admin/gallery/create", protectRoute, allowAccess(["admin"]), uploadGalleryImage, galleryController.createGalleryImage);
router.get("/admin/gallery", protectRoute, allowAccess(["admin"]), galleryController.getAllGalleryImages);
router.delete("/admin/gallery/delete/:id", protectRoute, allowAccess(["admin"]), galleryController.deleteGalleryImage);

module.exports = router