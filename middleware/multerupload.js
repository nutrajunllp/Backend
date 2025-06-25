// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

// module.exports.uploadFile = (folderName) => {
//   return multer({
//     storage: multer.diskStorage({
//       destination: (req, file, cb) => {
//         const uploadPath = `assets/${folderName}/`;
//         fs.mkdirSync(path.resolve(uploadPath), { recursive: true });
//         cb(null, uploadPath);
//       },
//       filename: (req, file, cb) => {
//         cb(null, Date.now() + "-" + file.originalname);
//       },
//     }),
//     fileFilter: (req, file, cb) => {
//       const allowedMimes = ["image/jpeg", "image/png"];
//       if (allowedMimes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new Error("Invalid file type. Only image files are allowed."));
//       }
//     }
//   });
// };