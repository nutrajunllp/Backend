const { StatusCodes } = require("http-status-codes");
const Gallery = require("../../models/galleryModel");
const ErrorHandler = require("../../middleware/errorHandler");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

// ✅ Create new gallery image
exports.createGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorHandler("Image is required", StatusCodes.BAD_REQUEST));
    }

    const newImage = new Gallery({
      image_url: req.file.location,
      caption: req.body.caption || "",
      status: req.body.status || "active",
    });

    await newImage.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Gallery image uploaded successfully.",
      data: newImage,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ✅ Get all images
exports.getAllGalleryImages = async (req, res, next) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ✅ Get all images
exports.getAllGalleryMainWeb = async (req, res, next) => {
  try {
    const images = await Gallery.find({ status: "active" }).sort({ createdAt: -1 });
    
    res.status(StatusCodes.OK).json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

// ✅ Delete gallery image
exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const image = await Gallery.findById(id);
    if (!image) {
      return next(new ErrorHandler("Image not found", StatusCodes.NOT_FOUND));
    }

    await deleteFileFromS3(image.image_url); // delete from S3
    await image.deleteOne(); // delete from DB

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gallery image deleted successfully",
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

exports.editGalleryImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, status } = req.body;

    const image = await Gallery.findById(id);
    if (!image) {
      return next(new ErrorHandler("Image not found", StatusCodes.NOT_FOUND));
    }

    // If a new image is uploaded, delete the old one from S3
    if (req.file && image.image_url) {
      await deleteFileFromS3(image.image_url);
      image.image_url = req.file.location; // update new image URL
    }

    // Update other fields
    if (caption !== undefined) image.caption = caption;
    if (status !== undefined) image.status = status;

    await image.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gallery image updated successfully.",
      data: image,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
