const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");
const Offer = require("../../models/offerModel");

module.exports.getHomeOffers = async (req, res, next) => {
  try {
    const formatDateInIST = (date) => {
      if (!date) return null;
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(date);
    };

    const todayIST = formatDateInIST(new Date());

    const offers = await Offer.find({
      status: 1,
      show_on_home: 1,
    })
      .populate({
        path: "product",
        select: "name title main_image price status visibility_home sku",
        match: { status: 1 },
      })
      .sort({ priority: -1, createdAt: -1 });

    const filteredOffers = offers.filter((offer) => {
      if (!offer.product) return false;

      const startDateIST = formatDateInIST(offer.start_date);
      const endDateIST = formatDateInIST(offer.end_date);

      if (startDateIST && todayIST < startDateIST) return false;
      if (endDateIST && todayIST > endDateIST) return false;

      return true;
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Home offers retrieved successfully",
      data: filteredOffers,
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
