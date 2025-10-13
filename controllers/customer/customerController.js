const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Customer = require("../../models/customerModel");
const blogModel = require("../../models/blogModel");

// Get customer data by ID
module.exports.getCustomerData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id)

    if (!customer) {
      return next(new ErrorHandler("Customer not found", StatusCodes.NOT_FOUND));
    }

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Customer data retrieved successfully",
      data: customer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// Update customer data
module.exports.updateCustomerData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const customer = await Customer.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", StatusCodes.NOT_FOUND));
    }

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Customer data updated successfully",
      data: customer,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// Check profile completion status
module.exports.checkProfileCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return next(new ErrorHandler("Customer not found", StatusCodes.NOT_FOUND));
    }

    const requiredFields = ["name", "email", "mobile_number"];
    const isComplete = requiredFields.every((field) => customer[field]);

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Profile completion status retrieved",
      data: { isComplete },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await blogModel.find({ status: "published" }).sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};