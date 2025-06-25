const express = require("express");
const router = express.Router();
const adminAuthController = require("../controllers/admin/adminAuthController");
const adminProductController = require("../controllers/admin/productController");
const adminCategoryController = require("../controllers/admin/categoryController");
const adminOrderController = require("../controllers/admin/orderController");
const adminCustomerController = require("../controllers/admin/userController");
const adminDashboardController = require("../controllers/admin/dashboardController");

const  uploadFile  = require("../middleware/multer-s3-upload");

const { protectRoute, allowAccess } = require("../middleware/auth");

const uploadProductPhotos = uploadFile("product").array("images");
const uploadCategoryBanner = uploadFile("category-banner").single("image");
const uploadOrderPhoto = uploadFile("order-photo").single("image");

//Auth
router.post("/admin/auth/register", adminAuthController.registerAdmin);
router.post("/admin/auth/login", adminAuthController.loginAdmin);

//Product 
router.post("/admin/product/create", protectRoute, allowAccess(["admin"]), uploadProductPhotos, adminProductController.createProduct)
router.get("/admin/product/all", protectRoute, allowAccess(["admin"]),adminProductController.getAllProducts)
router.get("/admin/product/one/:productId", protectRoute, allowAccess(["admin"]), adminProductController.getProductById)
router.put("/product/image-order", protectRoute, allowAccess(["admin"]), adminProductController.updateImageOrder);
router.put("/admin/product/edit/:productId", uploadProductPhotos, adminProductController.editProduct)

// router.delete("/admin/product/delete/:productId", protectRoute, allowAccess(["admin"]), adminProductController.deleteProduct)
// router.delete("/admin/product/deletes", protectRoute, allowAccess(["admin"]), adminProductController.deleteMultipleProducts)

//Category
router.post("/admin/category/create", protectRoute, allowAccess(["admin"]), adminCategoryController.createCategory)
router.get("/admin/category/all", protectRoute, allowAccess(["admin"]), adminCategoryController.getAllCategories)
router.get("/admin/category/one/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.getCategoryById)
router.put("/admin/category/edit/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.editCategory)
router.delete("/admin/category/delete/:categoryId", protectRoute, allowAccess(["admin"]), adminCategoryController.deleteCategory)

//Order
router.get("/admin/order/all",protectRoute, allowAccess(["admin"]), adminOrderController.getAllOrders);
router.get("/admin/order/one/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.getOrderById);
router.patch("/admin/order/update_status/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.updateOrderStatus);
router.patch("/admin/order/update_shipment/:_id", protectRoute, allowAccess(["admin"]), adminOrderController.updateShipment);
router.post("/admin/order/download-excel", protectRoute, allowAccess(["admin"]), adminOrderController.downloadOrderExcel);     
router.post("/admin/order/generate-labels", adminOrderController.generateShippingLabelPDF);     

//customer
router.get("/admin/customer/all",protectRoute, allowAccess(["admin"]), adminCustomerController.getAllCustomersPaginated);
router.patch("/admin/customer/update-status/:_id",protectRoute, allowAccess(["admin"]), adminCustomerController.updateCustomerStatus);

// Admin Dashboard
router.get("/admin/dashboard/summary",protectRoute, allowAccess(["admin"]),  adminDashboardController.getAdminDashboardCounts);
router.get("/admin/dashboard/chart", protectRoute, allowAccess(["admin"]),  adminDashboardController.getDashboardChart);
router.get("/admin/dashboard/order-summary", protectRoute, allowAccess(["admin"]), adminDashboardController.getOrderSummary);
router.get("/admin/dashboard/today-orders", protectRoute, allowAccess(["admin"]), adminDashboardController.getTodayOrders);

module.exports = router