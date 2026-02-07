const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

function parseNestedForm(body) {
  const parsed = {};

  for (const key in body) {
    const rawValue = body[key];
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

    if (key.includes("[")) {
      const [base, rest] = key.split("[");
      const bracketContent = rest.split("]")[0];
      const afterBracket = rest.substring(bracketContent.length + 1);
      const index = parseInt(bracketContent, 10);

      if (!isNaN(index)) {
        // Array format: key[0].title
        const subKey = afterBracket.startsWith(".") ? afterBracket.slice(1) : null;
        if (!parsed[base]) parsed[base] = [];
        if (!parsed[base][index]) parsed[base][index] = {};
        if (subKey) {
          parsed[base][index][subKey] = value;
        }
      } else {
        // Object format: meta[meta_title]
        const subKey = bracketContent;
        if (!parsed[base]) parsed[base] = {};
        parsed[base][subKey] = value;
      }
    } else if (key.includes(".") && !key.includes("[")) {
      // Nested: product_details.diet_type
      const parts = key.split(".");
      let current = parsed;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!current[p]) current[p] = {};
        current = current[p];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      parsed[key] = value;
    }
  }

  // Convert sparse arrays to dense and ensure product_details (merge product_detail if present)
  const arrayFields = ["key_benefits", "product_description", "disclaimer"];
  arrayFields.forEach((field) => {
    if (Array.isArray(parsed[field])) {
      parsed[field] = parsed[field].filter((item) => item && (Object.keys(item).length > 0 || item.title || item.description));
    }
  });
  if (parsed.product_detail && !parsed.product_details) {
    parsed.product_details = parsed.product_detail;
  }
  delete parsed.product_detail;

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

    const parsedBody = parseNestedForm(req.body);

    const { main_image, images, videos } = req.files || {};

    let mainImage = product.main_image;
    let updatedImages = product.images ? [...product.images] : [];
    let updatedVideos = product.videos ? [...product.videos] : [];

    if (main_image && main_image.length > 0) {
      if (product.main_image) {
        await deleteFileFromS3(product.main_image);
      }
      mainImage = main_image[0].location;
    }

    if (images && images.length > 0) {
      const newImageUrls = images.map((file) => file.location);
      const existingImages = Array.isArray(parsedBody.existing_images)
        ? parsedBody.existing_images
        : typeof parsedBody.existing_images === "string"
          ? (() => { try { return JSON.parse(parsedBody.existing_images); } catch { return []; } })()
          : [];
      updatedImages = [...existingImages, ...newImageUrls];
    } else if (parsedBody.existing_images !== undefined) {
      const existingImages = Array.isArray(parsedBody.existing_images)
        ? parsedBody.existing_images
        : typeof parsedBody.existing_images === "string"
          ? (() => { try { return JSON.parse(parsedBody.existing_images); } catch { return []; } })()
          : [];
      updatedImages = existingImages;
    }

    if (videos && videos.length > 0) {
      const newVideoUrls = videos.map((file) => file.location);
      const existingVideos = Array.isArray(parsedBody.existing_videos)
        ? parsedBody.existing_videos
        : typeof parsedBody.existing_videos === "string"
          ? (() => { try { return JSON.parse(parsedBody.existing_videos); } catch { return []; } })()
          : [];
      updatedVideos = [...existingVideos, ...newVideoUrls];
    } else if (parsedBody.existing_videos !== undefined) {
      const existingVideos = Array.isArray(parsedBody.existing_videos)
        ? parsedBody.existing_videos
        : typeof parsedBody.existing_videos === "string"
          ? (() => { try { return JSON.parse(parsedBody.existing_videos); } catch { return []; } })()
          : [];
      updatedVideos = existingVideos;
    }

    const newCategoryIds = parsedBody.category || req.body.category || [];
    const newCategoryArray = Array.isArray(newCategoryIds)
      ? newCategoryIds
      : [newCategoryIds].filter(Boolean);

    const oldCategoryIds = product.category || [];

    const removedCategoryIds = oldCategoryIds.filter(
      (id) => !newCategoryArray.includes(id.toString())
    );
    const addedCategoryIds = newCategoryArray.filter(
      (id) => !oldCategoryIds.map((cid) => cid.toString()).includes(id.toString())
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

    const excludeFields = ["existing_images", "existing_videos", "category"];
    const baseUpdate = { ...parsedBody };
    excludeFields.forEach((f) => delete baseUpdate[f]);

    const updatedData = {
      ...baseUpdate,
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

    // Build filter object
    const filter = {};

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== null && req.query.status !== "") {
      const numericStatus = parseInt(req.query.status);
      if (!isNaN(numericStatus)) {
        filter.status = numericStatus;
      }
    }

    // Search filter (by name or SKU)
    if (req.query.search && req.query.search.trim() !== "") {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { sku: { $regex: searchTerm, $options: "i" } }
      ];
    }

    const [products, totalProductsCount] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1, _id: -1 })  // Added _id to ensure consistent sorting
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

module.exports.deleteReview = async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);
    if (!product)
      return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));

    const reviewIndex = product.reviews.findIndex(
      (r) => r._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return next(
        new ErrorHandler("Review not found", StatusCodes.NOT_FOUND)
      );
    }

    product.reviews.splice(reviewIndex, 1);

    await product.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Review deleted successfully",
      data: product,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
};