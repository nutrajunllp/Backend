const Cart = require("../../models/cartModel");
const Product = require("../../models/productModel");
const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");

exports.addToCart = async (req, res, next) => {
  try {
    const customer_id = req.user?._id || req.headers["customer_id"];
    const { product_id, quantity } = req.body;

    if (!customer_id) {
      return next(
        new ErrorHandler("Customer ID is missing", StatusCodes.BAD_REQUEST)
      );
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return next(new ErrorHandler("Product not found", StatusCodes.NOT_FOUND));
    }

    const size = {
      package_weight: product.product_details.package_weight || "",
      number_of_piecces: product.product_details.number_of_piecces || "",
    };

    const item_price = Number(product.price?.website_price || 0);
    const qty = Number(quantity);

    let cart = await Cart.findOne({ customer_id });
    if (!cart) {
      cart = new Cart({ customer_id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === product_id &&
        item.size.package_weight === size.package_weight &&
        item.size.number_of_piecces === size.number_of_piecces
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += qty;
      cart.items[existingItemIndex].price.total_price =
        cart.items[existingItemIndex].quantity * item_price;
    } else {
      cart.items.push({
        product: product_id,
        size,
        quantity: qty,
        price: {
          item_price,
          total_price: qty * item_price,
        },
      });
    }

    cart.updated_at = Date.now();
    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Cart updated successfully",
      data: cart,
    });
  } catch (error) {
    next(
      new ErrorHandler(
        error.message,
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const customer_id = req.user?._id || req.headers["customer_id"];

    const cart = await Cart.findOne({ customer_id }).populate({
      path: "items.product",
      select: "name title short_description price images main_image",
    });

    if (!cart || cart.items.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Cart is empty",
        data: [],
        total_quantity: 0,
        total_price: 0,
      });
    }

    let total_quantity = 0;
    let total_price = 0;

    cart.items.forEach((item) => {
      total_quantity += item.quantity;
      total_price += item.price?.total_price || 0;
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Cart retrieved successfully",
      data: cart,
      total_quantity,
      total_price,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || 500));
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const customer_id = req.user?._id || req.headers["customer_id"];

    const { product_id } = req.body;

    const cart = await Cart.findOne({ customer_id });

    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== product_id
    );

    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Item removed from cart",
      data: cart,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || 500));
  }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    const customer_id = req.user?._id || req.headers["customer_id"];
    const { product_id, quantity } = req.body;

    const cart = await Cart.findOne({ customer_id });
    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === product_id
    );
    if (itemIndex === -1) return next(new ErrorHandler("Item not found", 404));

    if (Number(quantity) === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(product_id);
      if (!product) return next(new ErrorHandler("Product not found", 404));

      const itemPrice = product?.price?.website_price || 0;

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = {
        item_price: itemPrice,
        total_price: itemPrice * quantity,
      };
    }

    cart.updated_at = Date.now();
    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message:
        quantity === 0
          ? "Item removed from cart successfully"
          : "Quantity and total price updated successfully",
      data: cart,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || 500));
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const customer_id = req.user?._id || req.headers["customer_id"];

    const cart = await Cart.findOne({ customer_id });
    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    cart.items = [];
    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Cart cleared",
      data: cart,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, error.statusCode || 500));
  }
};
