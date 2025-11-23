const ErrorHandler = require("../middleware/errorHandler");

module.exports = (err, req, res, next) => {
  err.code = err.code || 500;
  err.message = err.message || "Internal Server Error";

  switch (err.name) {
    case "CastError":
      err = new ErrorHandler(`Resource not found. Invalid ID: ${err.value}`, 404);
      break;

    case "JsonWebTokenError":
      err = new ErrorHandler("JSON Web Token is invalid. Please try again.", 400);
      break;

    case "TokenExpiredError":
      err = new ErrorHandler("JSON Web Token has expired. Please try again.", 400);
      break;
  }

  // Handle Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    err = new ErrorHandler("File size too large. Maximum file size is 10MB.", 400);
  }
  
  if (err.code === "LIMIT_FILE_COUNT") {
    err = new ErrorHandler("Too many files. Maximum 20 files allowed.", 400);
  }
  
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    err = new ErrorHandler("Unexpected file field.", 400);
  }

  if (err.code === 11000 && err.message.includes("dup key")) {
    const match = err.message.match(/index: (\w+)_\d+ dup key: { (\w+): "([^"]+)" }/);
    const key = match ? match[2] : "Unknown";
    const value = match ? match[3] : "Unknown";
    err = new ErrorHandler(`Duplicate value for '${key}': '${value}'. Choose another.`, 400);
  }  
  

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message);
    err = new ErrorHandler(`Validation error: ${errors.join(" | ")}`, 400);
  }

  res.status(err.code).json({
    code: err.code,
    success: false,
    message: err.message,
  });
};
