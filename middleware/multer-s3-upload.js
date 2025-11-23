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
    // ✅ Increased file size limits for images and videos
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 20, // Maximum 20 files
    },

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
    if (!fileKeys) return;

    const keys = Array.isArray(fileKeys) ? fileKeys : [fileKeys];

    const objectsToDelete = keys
      .filter((url) => typeof url === "string" && url.includes(".amazonaws.com/"))
      .map((url) => ({
        Key: url.split(".amazonaws.com/")[1],
      }));

    if (objectsToDelete.length === 0) return;

    const command = new DeleteObjectsCommand({
      Bucket: "nutrajun",
      Delete: { Objects: objectsToDelete },
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