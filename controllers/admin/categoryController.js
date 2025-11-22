const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Category = require("../../models/categoryModel");

module.exports.createCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    
    if (req.file) {
      categoryData.image = req.file.location;
    }

    const newCategory = new Category(categoryData);

    await newCategory.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Category created successfully",
      data: {
        _id: newCategory._id,
      },
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

// Update Category
module.exports.editCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    let category = await Category.findById(categoryId);

    if (!category) {
      return next(
        new ErrorHandler("Category not found", StatusCodes.NOT_FOUND)
      );
    }

    category = await Category.findByIdAndUpdate(categoryId, req.body, {
      new: true,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Category updated successfully",
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
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const skip = (page - 1) * perPage;

    const [categories, totalCategoriesCount] = await Promise.all([
      Category.find().populate("products").skip(skip).limit(perPage),
      Category.countDocuments(),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
      pagination: {
        total_items: totalCategoriesCount,
        total_pages: Math.ceil(totalCategoriesCount / perPage),
        current_page_item: categories.length,
        page_no: page,
        items_per_page: perPage,
      },
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

module.exports.deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return next(
        new ErrorHandler("Category not found", StatusCodes.NOT_FOUND)
      );
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Category deleted successfully",
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