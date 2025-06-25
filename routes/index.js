// routeIndex.js
const express = require("express");
const adminRoutes = require("./adminRoute");
const customerRoutes = require("./customerRoute");

const router = express.Router();

router.use(adminRoutes);
router.use(customerRoutes);

module.exports = router;