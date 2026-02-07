const { StatusCodes } = require("http-status-codes");
const Gallery = require("../../models/galleryModel");
const ErrorHandler = require("../../middleware/errorHandler");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

// ✅ Create new gallery item (image or video)
exports.createGalleryImage = async (req, res, next) => {
  try {
    const files = req.files || {};
    const imageFile = files.image?.[0];
    const videoFile = files.video?.[0];
    const type = req.body.type || "image";

    if (type === "image") {
      if (!imageFile) {
        return next(new ErrorHandler("Image is required", StatusCodes.BAD_REQUEST));
      }
    } else if (type === "video") {
      if (!videoFile) {
        return next(new ErrorHandler("Video is required", StatusCodes.BAD_REQUEST));
      }
    } else {
      return next(new ErrorHandler("Invalid type. Use 'image' or 'video'", StatusCodes.BAD_REQUEST));
    }

    const newItem = new Gallery({
      type,
      image_url: type === "image" ? imageFile.location : undefined,
      video_url: type === "video" ? videoFile.location : undefined,
      caption: req.body.caption || "",
      status: req.body.status || "active",
    });

    await newItem.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Gallery ${type} uploaded successfully.`,
      data: newItem,
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

// ✅ Delete gallery item (image or video)
exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await Gallery.findById(id);
    if (!item) {
      return next(new ErrorHandler("Gallery item not found", StatusCodes.NOT_FOUND));
    }

    const urlToDelete = (item.type || "image") === "image" ? item.image_url : item.video_url;
    if (urlToDelete) {
      await deleteFileFromS3(urlToDelete);
    }
    await item.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

exports.editGalleryImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, status } = req.body;
    const files = req.files || {};
    const imageFile = files.image?.[0];
    const videoFile = files.video?.[0];

    const item = await Gallery.findById(id);
    if (!item) {
      return next(new ErrorHandler("Gallery item not found", StatusCodes.NOT_FOUND));
    }

    // Update image if new image uploaded
    if (imageFile && (item.type || "image") === "image") {
      if (item.image_url) await deleteFileFromS3(item.image_url);
      item.image_url = imageFile.location;
    }

    // Update video if new video uploaded
    if (videoFile && (item.type || "image") === "video") {
      if (item.video_url) await deleteFileFromS3(item.video_url);
      item.video_url = videoFile.location;
    }

    if (caption !== undefined) item.caption = caption;
    if (status !== undefined) item.status = status;

    await item.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gallery item updated successfully.",
      data: item,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};
