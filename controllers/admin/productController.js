const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

module.exports.createProduct = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(
        new ErrorHandler(
          "At least one image is required.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (req.files && req.files.length > 0) {
      images = req.files.map((file, index) => ({
        name: file.location,
        num: index + 1,
      }));
    }
    const newProduct = new Product({
      ...req.body,
      images,
    });

    await newProduct.save();

    if (newProduct.category && Array.isArray(newProduct.category)) {
      await Promise.all(
        newProduct.category.map((catId) =>
          Category.findByIdAndUpdate(
            catId,
            { $push: { products: newProduct._id } },
            { new: true }
          )
        )
      );
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
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

module.exports.editProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    let product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND));
    }

    let updatedImages = [...product.images];

    if (req.files && req.files.length > 0) {
      const startNum = updatedImages.length + 1;

      const newImages = req.files.map((file, index) => ({
        name: file.location,
        num: startNum + index,
      }));

      updatedImages = [...updatedImages, ...newImages];
    }

    const newCategoryIds = req.body.category || [];

    const newCategoryArray = Array.isArray(newCategoryIds)
      ? newCategoryIds
      : [newCategoryIds];

    const oldCategoryIds = product.category || [];

    const removedCategoryIds = oldCategoryIds.filter(
      (id) => !newCategoryArray.includes(id.toString())
    );
    const addedCategoryIds = newCategoryArray.filter(
      (id) => !oldCategoryIds.map((cid) => cid.toString()).includes(id)
    );

    await Promise.all(
      removedCategoryIds.map((catId) =>
        Category.findByIdAndUpdate(
          catId,
          { $pull: { products: product._id } },
          { new: true }
        )
      )
    );

    await Promise.all(
      addedCategoryIds.map((catId) =>
        Category.findByIdAndUpdate(
          catId,
          { $addToSet: { products: product._id } },
          { new: true }
        )
      )
    );

    const updatedData = {
      ...req.body,
      images: updatedImages,
      category: newCategoryArray,
    };

    const updatedProduct = await Product.findByIdAndUpdate(productId, updatedData, {
      new: true,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.getProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return next(
        new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND)
      );
    }

    res.status(StatusCodes.OK).json({
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

module.exports.getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const skip = (page - 1) * perPage;

    const filter = req.query.category ? { category: req.query.category } : {};

    const [products, totalProductsCount] = await Promise.all([
      Product.find(filter).skip(skip).limit(perPage),
      Product.countDocuments(filter),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
      pagination: {
        total_items: totalProductsCount,
        total_pages: Math.ceil(totalProductsCount / perPage),
        current_page_item: products.length,
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

module.exports.deleteProductImages = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { imageNums } = req.body;

    if (!Array.isArray(imageNums) || imageNums.length === 0) {
      return next(
        new ErrorHandler("imageNums must be a non-empty array.", StatusCodes.BAD_REQUEST)
      );
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return next(new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND));
    }

    const remainingImages = product.images.filter(
      (img) => !imageNums.includes(img.num)
    );

    const reorderedImages = remainingImages.map((img, index) => ({
      ...img,
      num: index + 1,
    }));

    await Product.updateOne(
      { _id: productId },
      { $set: { images: reorderedImages } }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Selected images deleted successfully",
      data: reorderedImages,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};

module.exports.updateImageNumbers = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { imageUpdates } = req.body;

    if (!Array.isArray(imageUpdates) || imageUpdates.length === 0) {
      return next(
        new ErrorHandler("imageUpdates must be a non-empty array.", StatusCodes.BAD_REQUEST)
      );
    }

    const product = await Product.findById(productId).lean(); 
    if (!product) {
      return next(new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND));
    }

    const images = product.images || [];
    const totalImages = images.length;

    // Check: No duplicate newNum values
    const newNums = imageUpdates.map((img) => img.newNum);
    const hasDuplicateNums = new Set(newNums).size !== newNums.length;
    if (hasDuplicateNums) {
      return next(
        new ErrorHandler("Image numbers must be unique.", StatusCodes.BAD_REQUEST)
      );
    }

    // Check: newNum should not exceed total image count
    const invalidNewNums = newNums.filter((num) => num > totalImages || num < 1);
    if (invalidNewNums.length > 0) {
      return next(
        new ErrorHandler(
          `Invalid new image numbers: ${invalidNewNums.join(
            ", "
          )}. Must be between 1 and ${totalImages}.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Update the image nums
    const updatedImages = images.map((img) => {
      const update = imageUpdates.find((u) => u.currentNum === img.num);
      return update
        ? { ...img, num: update.newNum }
        : img;
    });

    await Product.updateOne(
      { _id: productId },
      { $set: { images: updatedImages } }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Image numbers updated successfully",
      data: updatedImages,
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

module.exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND));
    }

    if (product.images && product.images.length > 0) {
      const keys = product.images.map((img) => img.name);
      await deleteFileFromS3(keys);
    }

    if (Array.isArray(product.category) && product.category.length > 0) {
      await Promise.all(
        product.category.map((catId) =>
          Category.findByIdAndUpdate(
            catId,
            { $pull: { products: product._id } },
            { new: true }
          )
        )
      );
    }

    await Product.findByIdAndDelete(productId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product and its images deleted successfully",
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};