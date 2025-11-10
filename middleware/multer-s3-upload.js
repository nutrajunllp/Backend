const multer = require("multer");
const multerS3 = require("multer-s3");
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const s3 = require("../utils/s3");
const ErrorHandler = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");

const uploadFile = (folderName) => {
  return multer({
    storage: multerS3({
      s3,
      bucket: "nutrajun",
      acl: "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, `Nutrajun/${folderName}/${fileName}`);
      },
    }),
    // ✅ No size limit — unlimited upload size
    limits: {},

    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "video/mp4",
        "video/quicktime",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new ErrorHandler(
            "Invalid file type. Only JPEG, PNG, MP4, and MOV allowed.",
            StatusCodes.BAD_REQUEST
          )
        );
      }
    },
  });
};

const deleteFileFromS3 = async (fileKeys) => {
  try {
    if (!fileKeys || (Array.isArray(fileKeys) && fileKeys.length === 0)) {
      throw new ErrorHandler(
        "No file keys provided for deletion.",
        StatusCodes.BAD_REQUEST
      );
    }

    const keys = Array.isArray(fileKeys) ? fileKeys : [fileKeys];

    // Extract S3 object keys from URLs
    const objectsToDelete = keys.map((url) => ({
      Key: url.split(".amazonaws.com/")[1],
    }));

    if (objectsToDelete.length === 0) return;

    const command = new DeleteObjectsCommand({
      Bucket: "nutrajun",
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    });

    await s3.send(command);
  } catch (error) {
    throw new ErrorHandler(
      `Failed to delete files from S3: ${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  uploadFile,
  deleteFileFromS3,
};