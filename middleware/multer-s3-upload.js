const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3");

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
        cb(new Error("Invalid file type. Only JPEG and PNG allowed."));
      }
    },
  });
};

module.exports = uploadFile;
