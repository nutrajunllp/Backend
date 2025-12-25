const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const BlogModel = require("../../models/blogModel");
const { deleteFileFromS3 } = require("../../middleware/multer-s3-upload");

exports.createBlog = async (req, res, next) => {
  try {
    const { main_title, content, status } = req.body;

    const parsedContent = JSON.parse(content || "[]");

    const files = req.files;
    const mainImageFile = files.find((f) => f.fieldname === "main_image");
    const mainImage = mainImageFile ? mainImageFile.location : null;

    const finalContent = parsedContent.map((item, index) => {
      const contentImageFile = files.find(
        (f) => f.fieldname === `content[${index}].contentImages`
      );
      return {
        title: item.title,
        description: item.description,
        image: contentImageFile ? contentImageFile.location : "",
      };
    });

    const newBlog = await BlogModel.create({
      main_title,
      main_image: mainImage,
      content: finalContent,
      status,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await BlogModel.find().sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.getBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await BlogModel.findById(id);

    if (!blog) {
      return next(new ErrorHandler("Blog not found", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, StatusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await BlogModel.findById(id);
    if (!blog) {
      return next(new ErrorHandler("Blog not found", StatusCodes.NOT_FOUND));
    }

    const { main_title, content, status, main_image_removed } = req.body;
    const files = req.files || [];

    let parsedContent = [];
    if (content) {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = blog.content || [];
    }

    const mainImageFile = files.find((f) => f.fieldname === "main_image");
    let mainImage = blog.main_image;

    // Handle main image
    if (mainImageFile) {
      // New image uploaded - delete old one if exists
      if (blog.main_image) {
        await deleteFileFromS3(blog.main_image);
      }
      mainImage = mainImageFile.location;
    } else if (main_image_removed === 'true' || main_image_removed === true) {
      // Image was removed by user (already deleted from S3 by frontend)
      mainImage = null;
    }
    // If neither new file nor removed flag, keep existing image

    // Collect images to delete when replaced
    const imagesToDelete = [];
    
    const updatedContent = parsedContent.map((item, index) => {
      const newFile = files.find(
        (f) => f.fieldname === `content[${index}].contentImages`
      );

      let oldImage = blog.content[index]?.image || "";
      let finalImage = oldImage;

      if (newFile) {
        // New image file uploaded - mark old one for deletion
        if (oldImage) {
          imagesToDelete.push(oldImage);
        }
        finalImage = newFile.location;
      } else if (item.image === null || item.image === '') {
        // Image was explicitly removed (already deleted from S3 by frontend)
        finalImage = "";
      }
      // If neither new file nor null, keep existing image

      return {
        title: item.title || blog.content[index]?.title,
        description: item.description || blog.content[index]?.description,
        image: finalImage,
      };
    });
    
    // Delete old images that were replaced (in parallel)
    if (imagesToDelete.length > 0) {
      await deleteFileFromS3(imagesToDelete);
    }

    blog.main_title = main_title || blog.main_title;
    blog.main_image = mainImage;
    blog.content = updatedContent;
    blog.status = status || blog.status;

    await blog.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
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

module.exports.deleteBlogImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageLinks } = req.body;

    if (!id) {
      return next(
        new ErrorHandler("Blog ID is required.", StatusCodes.BAD_REQUEST)
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

    const blog = await BlogModel.findById(id);
    if (!blog) {
      return next(new ErrorHandler("Blog not found.", StatusCodes.NOT_FOUND));
    }

    // Delete from S3
    await deleteFileFromS3(imageLinks);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Selected image(s) deleted successfully from S3.",
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

module.exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await BlogModel.findById(id);

    if (!blog) {
      return next(new ErrorHandler("Blog not found", StatusCodes.NOT_FOUND));
    }

    const fileUrls = [];

    if (blog.main_image) fileUrls.push(blog.main_image);
    if (Array.isArray(blog.content)) {
      blog.content.forEach((block) => {
        if (block.image) fileUrls.push(block.image);
      });
    }

    await BlogModel.findByIdAndDelete(id);

    // Delete related S3 files (if exist)
    if (fileUrls.length > 0) {
      await deleteFileFromS3(fileUrls);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Blog deleted successfully",
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

