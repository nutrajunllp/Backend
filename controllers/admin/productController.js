const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

function parseNestedForm(body) {
  const parsed = {};

  for (const key in body) {
    const value = body[key];

    if (key.includes("[")) {
      const [base, rest] = key.split("[");
      const index = parseInt(rest.split("]")[0]);
      const subKey = rest.split("].")[1];

      if (!parsed[base]) parsed[base] = [];
      if (!parsed[base][index]) parsed[base][index] = {};

      parsed[base][index][subKey] = value.trim();
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
}

module.exports.createProduct = async (req, res, next) => {
  try {
    const { main_image, images, videos } = req.files || {};

    if (!main_image || main_image.length === 0) {
      return next(new ErrorHandler("Main image is required.", StatusCodes.BAD_REQUEST));
    }

    const parsedBody = parseNestedForm(req.body);

    const newProduct = new Product({
      ...parsedBody,
      main_image: main_image[0].location,
      images: images ? images.map((f) => f.location) : [],
      videos: videos ? videos.map((f) => f.location) : [],
    });

    await newProduct.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || 500));
  }
};


module.exports.editProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    let product = await Product.findById(productId);
    if (!product) {
      return next(
        new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND)
      );
    }

    const { main_image, images, videos } = req.files || {};

    let mainImage = product.main_image;
    let updatedImages = [...product.images];
    let updatedVideos = [...product.videos];

    if (main_image && main_image.length > 0) {
      if (product.main_image) {
        await deleteFileFromS3(product.main_image);
      }
      mainImage = main_image[0].location;
    }

    if (images && images.length > 0) {
      if (product.images && product.images.length > 0) {
        await deleteFileFromS3(product.images);
      }
      updatedImages = images.map((file) => file.location);
    }

    if (videos && videos.length > 0) {
      if (product.videos && product.videos.length > 0) {
        await deleteFileFromS3(product.videos);
      }
      updatedVideos = videos.map((file) => file.location);
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
      main_image: mainImage,
      images: updatedImages,
      videos: updatedVideos,
      category: newCategoryArray,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatedData,
      { new: true }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
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
      Product.find(filter)
        .sort({ createdAt: -1 })  
        .skip(skip)
        .limit(perPage),
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
    const { imageLinks } = req.body;

    if (!productId) {
      return next(
        new ErrorHandler("Product ID is required.", StatusCodes.BAD_REQUEST)
      );
    }

    if (!Array.isArray(imageLinks) || imageLinks.length === 0) {
      return next(
        new ErrorHandler(
          "imageLinks must be a non-empty array of image URLs.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found.", StatusCodes.NOT_FOUND));
    }

    // ✅ Delete from S3
    await deleteFileFromS3(imageLinks);

    // ✅ Remove image links from product
    const updatedImages = product.images.filter(
      (img) => !imageLinks.includes(img)
    );

    product.images = updatedImages;
    await product.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Selected image(s) deleted successfully from S3 and product.",
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
      const keys = product.images
        .map((img) => img?.name)
        .filter((url) => typeof url === "string");

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