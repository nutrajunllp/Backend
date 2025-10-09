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

    const { main_title, content, status } = req.body;
    const files = req.files || [];

    let parsedContent = [];
    if (content) {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = blog.content || [];
    }

    const mainImageFile = files.find((f) => f.fieldname === "main_image");
    let mainImage = blog.main_image;

    if (mainImageFile) {
      if (blog.main_image) {
        await deleteFileFromS3(blog.main_image);
      }
      mainImage = mainImageFile.location;
    }

    const updatedContent = parsedContent.map((item, index) => {
      const newFile = files.find(
        (f) => f.fieldname === `content[${index}].contentImages`
      );

      let oldImage = blog.content[index]?.image || "";
      let finalImage = oldImage;

      if (newFile) {
        if (oldImage) deleteFileFromS3(oldImage);
        finalImage = newFile.location;
      }

      return {
        title: item.title || blog.content[index]?.title,
        description: item.description || blog.content[index]?.description,
        image: finalImage,
      };
    });

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

