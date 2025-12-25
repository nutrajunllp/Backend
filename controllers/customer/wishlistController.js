const Wishlist = require("../../models/wishlistModel");
const { StatusCodes } = require("http-status-codes");

exports.addToWishlist = async (req, res, next) => {
  try {
    // Accept both productId and product_id for compatibility
    const productId = req.body.productId || req.body.product_id;
    const customerId = req.user._id; // from auth middleware

    if (!productId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Product ID is required",
      });
    }

    let wishlist = await Wishlist.findOne({ customer: customerId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        customer: customerId,
        items: [{ product: productId }],
      });
    } else {
      // Ensure items array exists before calling .some()
      if (!wishlist.items || !Array.isArray(wishlist.items)) {
        wishlist.items = [];
      }

      const exists = wishlist.items.some(
        item => item.product && item.product.toString() === productId.toString()
      );

      if (exists) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Product already in wishlist",
        });
      }

      wishlist.items.push({ product: productId });
      wishlist.updated_at = Date.now();
      await wishlist.save();
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product added to wishlist",
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWishlist = async (req, res, next) => {
  try {
    const customerId = req.user._id;

    const wishlist = await Wishlist.findOne({ customer: customerId })
      .populate("items.product");

    // Format response to match frontend expectations
    const products = wishlist && wishlist.items ? wishlist.items.map(item => item.product).filter(Boolean) : [];

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        products: products,
        items: wishlist?.items || []
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const customerId = req.user._id;

    const wishlist = await Wishlist.findOneAndUpdate(
      { customer: customerId },
      { 
        $pull: { items: { product: productId } },
        updated_at: Date.now()
      },
      { new: true }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product removed from wishlist",
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearWishlist = async (req, res, next) => {
  try {
    const customerId = req.user._id;

    await Wishlist.findOneAndUpdate(
      { customer: customerId },
      { items: [], updated_at: Date.now() }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.checkWishlistProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const customerId = req.user._id;

    const wishlist = await Wishlist.findOne({
      customer: customerId,
      "items.product": productId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        isInWishlist: !!wishlist,
      },
    });
  } catch (error) {
    next(error);
  }
};
