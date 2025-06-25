const { StatusCodes } = require("http-status-codes");
const Customer = require("../../models/customerModel");
const ErrorHandler = require("../../middleware/errorHandler");

module.exports.getAllCustomersPaginated = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const search = req.query.search || "";
    const status = req.query.status;

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile_number: { $regex: search, $options: "i" } },
      ],
    };

    if (status === "0" || status === "1") {
      query.status = parseInt(status);
    }

    const totalCustomersCount = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 }) 
      .select("_id name email mobile_number status createdAt");

    res.status(StatusCodes.OK).json({
      success: true,
      data: customers,
      pagination: {
        total_items: totalCustomersCount,
        total_pages: Math.ceil(totalCustomersCount / perPage),
        current_page_item: customers.length,
        page_no: page,
        items_per_page: perPage,
      },
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

module.exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { _id } = req.params;
    const { status } = req.body;

    if (![0, 1].includes(status)) {
      return next(
        new ErrorHandler("Status must be 0 (inactive) or 1 (active)", 400)
      );
    }

    const customer = await Customer.findById(_id);
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    customer.status = status;
    await customer.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Customer status updated to ${
        status === 1 ? "Active" : "Inactive"
      }`,
      data: {
        _id: customer._id,
        email: customer.email,
        status: customer.status,
      },
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
