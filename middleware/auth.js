const { verifyToken } = require("../utils/tokenGenerator");
const ErrorHandler = require("./errorHandler");

const protectRoute = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new ErrorHandler("Enter authentication your token", 401));

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  let user;
  try {
    user = verifyToken(token);
  } catch (error) {
    return next(new ErrorHandler("Sorry you are not authorized", 401));
  }

  const userId = user?._id;
  if (!userId) return next(new ErrorHandler("Sorry you are not authorized", 401));
  req.user = user;
  req.id = userId;
  next();
};

const allowAccess = (roles = []) => {
  return (req, res, next) => {
    const user = req.user;

    if (!roles.includes(user.role)) {
      return next(new ErrorHandler("Sorry, you are not authorized", 401));
    }

    if (user.status === 0) {
      return next(
        new ErrorHandler("Your account is inactive. Please contact support.", 403)
      );
    }

    next();
  };
};

module.exports = {
  protectRoute,
  allowAccess
}
