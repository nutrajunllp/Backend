const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Product = require("../../models/productModel");
const { default: mongoose } = require("mongoose");
const User = require("../../models/adminModel");
const Customer = require("../../models/customerModel");

module.exports.getProductsCustomerHome = async (req, res, next) => {
  try {
    const visibilityFilter = req.query.visibility_home || 1;
    const products = await Product.find({ visibility_home: visibilityFilter }).sort({ createdAt: -1 });

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Products retrieved successfully",
      data: products,
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

module.exports.searchProductsCustomer = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return next(
        new ErrorHandler("Search query is required", StatusCodes.BAD_REQUEST)
      );
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Search results retrieved successfully",
      data: products,
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

module.exports.getSingleProductCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    } else {
      product = await Product.findOne({ sku: id });
    }

    if (!product) {
      return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
    }

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Product retrieved successfully",
      data: product,
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

module.exports.getAllProductsCustomer = async (req, res, next) => {
  try {
    const parsePositiveInt = (value, fallback) => {
      const parsed = parseInt(value, 10);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    };

    const {
      category,
      minPrice,
      maxPrice,
      qty,
      status = 1,
      page,
      perPage,
      page_no,
      items_per_page,
      limit,
      stock_availability
    } = req.query;

    const productType = req.query.productType;
    const normalizedPage = parsePositiveInt(page_no ?? page, 1);
    const normalizedItemsPerPage = parsePositiveInt(items_per_page ?? perPage ?? limit, 10);

    if (productType === undefined) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "productType is required. Allowed values: 0 (Normal) or 1 (Inquiry)",
      });
    }

    if (!["0", "1"].includes(productType)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid productType. Allowed values are 0 (Normal) or 1 (Inquiry)",
      });
    }

    let filter = {};

    filter.inquiry = Number(productType);

    if (stock_availability !== undefined) {
      if (!["0", "1"].includes(stock_availability)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid stock_availability. Allowed values are 0 or 1",
        });
      }
      filter.stock_availability = Number(stock_availability);
    }

    if (category) {
      const categoryArray = Array.isArray(category)
        ? category
        : category.split(",").map(id => id.trim());
      const normalizedCategories = categoryArray
        .filter(Boolean)
        .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id));
      filter.category = { $in: normalizedCategories };
    }

    if (qty) {
      filter.qty = { $gte: Number(qty) };
    }

    if (minPrice != null || maxPrice != null) {
      filter["price.website_price"] = {};
      if (minPrice != null)
        filter["price.website_price"].$gte = Number(minPrice);
      if (maxPrice != null)
        filter["price.website_price"].$lte = Number(maxPrice);
    }

    filter.status = Number(status);

    const skip = (normalizedPage - 1) * normalizedItemsPerPage;
    const deterministicSort = { createdAt: -1, _id: -1 };
    const matchStage = { $match: filter };
    const dedupeStage = {
      $group: {
        _id: "$_id",
        doc: { $first: "$$ROOT" },
      },
    };

    const [products, totalCountResult] = await Promise.all([
      Product.aggregate([
        matchStage,
        { $sort: deterministicSort },
        dedupeStage,
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: deterministicSort },
        { $skip: skip },
        { $limit: normalizedItemsPerPage },
      ]),
      Product.aggregate([
        matchStage,
        dedupeStage,
        { $count: "total_items" },
      ]),
    ]);

    const totalCount = totalCountResult[0]?.total_items || 0;

    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      success: true,
      message: "Product retrieved successfully",
      data: products,
      pagination: {
        total_items: totalCount,
        total_pages: Math.ceil(totalCount / normalizedItemsPerPage),
        current_page_item: products.length,
        page_no: normalizedPage,
        items_per_page: normalizedItemsPerPage,
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

module.exports.addReviewCustomer = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment, image, user_detail } = req.body;

    if (!rating || !comment || !user_detail) {
      return next(
        new ErrorHandler(
          "Name and Rating and Comment are required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (rating < 1 || rating > 5) {
      return next(
        new ErrorHandler(
          "Rating must be between 1 and 5",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
    }

    const alreadyReviewed = product.reviews.find(
      (rev) =>
        rev.user_detail.name?.toString() === user_detail.name?.toString()
    );
    if (alreadyReviewed) {
      return next(
        new ErrorHandler(
          "You already reviewed this product",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const newReview = {
      rating,
      comment,
      user_detail,
      image: null,
      visible: 1,
    };

    product.reviews.push(newReview);
    await product.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        error.message || "Something went wrong",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};
