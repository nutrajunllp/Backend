const Contact = require("../../models/contactUsModel");
const { StatusCodes } = require("http-status-codes");
const ErrorHandler = require("../../middleware/errorHandler");

exports.createContact = async (req, res, next) => {
  try {
    const { first_name, last_name, email, number, subject, message } = req.body;

    if (!first_name || !last_name || !email || !subject || !message) {
      return next(
        new ErrorHandler("All fields are required.", StatusCodes.BAD_REQUEST)
      );
    }

    const contact = await Contact.create({
      first_name,
      last_name,
      email,
      number,
      subject,
      message,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Your message has been sent successfully!",
      data: contact,
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

exports.getAllContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "All contacts fetched successfully.",
      data: contacts,
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

exports.getSingleContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findById(contactId);

    if (!contact) {
      return next(new ErrorHandler("Contact not found.", StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Contact details fetched successfully.",
      data: contact,
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

const normalizeContactIds = (req) => {
  const { contactIds, contactId, ids } = req.body || {};

  if (Array.isArray(contactIds)) return contactIds;
  if (Array.isArray(ids)) return ids;

  if (typeof contactIds === "string" && contactIds.trim()) {
    return contactIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  if (typeof ids === "string" && ids.trim()) {
    return ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  if (typeof contactId === "string" && contactId.trim()) {
    return [contactId.trim()];
  }

  if (typeof req.query?.contactIds === "string" && req.query.contactIds.trim()) {
    return req.query.contactIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
};

exports.deleteMultipleContacts = async (req, res, next) => {
  try {
    const normalizedIds = normalizeContactIds(req);

    if (!normalizedIds.length) {
      return next(
        new ErrorHandler(
          "Provide at least one contact id in contactIds (array) or contactId (string).",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const result = await Contact.deleteMany({ _id: { $in: normalizedIds } });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Selected contacts deleted successfully.",
      deletedCount: result.deletedCount || 0,
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
