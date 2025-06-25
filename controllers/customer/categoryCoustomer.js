const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Category = require("../../models/categoryModel");

module.exports.getCategoryById = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId).populate("products");

    if (!category) {
      return next(
        new ErrorHandler("Category not found", StatusCodes.NOT_FOUND)
      );
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

module.exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};