#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "")
    .replace(/[^\w]/g, "");

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (value) =>
  String(value || "customer")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "customer";

const parseArgs = () => {
  const args = process.argv.slice(2);
  let filePath = path.resolve(process.cwd(), "imports/reviews.xlsx");
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--file" && args[i + 1]) {
      filePath = path.resolve(process.cwd(), args[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      filePath = path.resolve(process.cwd(), arg.split("=")[1]);
    }
  }

  return { dryRun, filePath };
};

const generateSyntheticEmail = (customerName, country) => {
  const base = `${customerName || "customer"}|${country || ""}`;
  const hash = crypto.createHash("sha1").update(base).digest("hex").slice(0, 8);
  const nameSlug = slugify(customerName);
  return `${nameSlug}-${hash}@import.local`;
};

const printRowLog = (rowNo, status, reason, details = "") => {
  const detailPart = details ? ` | ${details}` : "";
  console.log(`Row ${rowNo} | ${status} | ${reason}${detailPart}`);
};

const resolveColumns = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  const keyToCol = {};

  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeKey(cell.value);
    if (normalized) {
      keyToCol[normalized] = colNumber;
    }
  });

  const getColumn = (possibleKeys) =>
    possibleKeys.map((k) => normalizeKey(k)).find((k) => keyToCol[k]);

  const customerKey = getColumn(["customername", "customer_name", "customer"]);
  const countryKey = getColumn(["country"]);
  const starKey = getColumn(["star", "stars", "rating"]);
  const productKey = getColumn(["productname", "product_name", "product"]);
  const descriptionKey = getColumn([
    "dicription",
    "description",
    "review",
    "comment",
    "reviewtext",
  ]);

  const missing = [];
  if (!customerKey) missing.push("customer name");
  if (!countryKey) missing.push("country");
  if (!starKey) missing.push("star");
  if (!productKey) missing.push("product name");
  if (!descriptionKey) missing.push("dicription/description");

  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}`);
  }

  return {
    customerCol: keyToCol[customerKey],
    countryCol: keyToCol[countryKey],
    starCol: keyToCol[starKey],
    productCol: keyToCol[productKey],
    descriptionCol: keyToCol[descriptionKey],
  };
};

const readCell = (row, colNumber) => String(row.getCell(colNumber).text || "").trim();

const findProduct = async (productName) => {
  if (!productName) return null;

  const exactNameRegex = new RegExp(`^${escapeRegex(productName)}$`, "i");
  return Product.findOne({
    $or: [
      { name: { $regex: exactNameRegex } },
      { title: { $regex: exactNameRegex } },
      { sku: { $regex: exactNameRegex } },
    ],
  });
};

const isDuplicateReview = (product, customerName, comment) => {
  const normalizedName = normalizeText(customerName);
  const normalizedComment = normalizeText(comment);

  return product.reviews.some((review) => {
    const existingName = normalizeText(review?.user_detail?.name);
    const existingComment = normalizeText(review?.comment);
    return existingName === normalizedName && existingComment === normalizedComment;
  });
};

const getOrCreateCustomer = async ({ customerName, country, dryRun }) => {
  const email = generateSyntheticEmail(customerName, country);
  let customer = await Customer.findOne({ email });

  if (!customer && !dryRun) {
    customer = await Customer.create({
      name: customerName,
      email,
      role: "customer",
      status: 1,
      addresses: [
        {
          type: "other",
          country: country || "India",
          is_default: true,
        },
      ],
    });
  }

  return { customer, email, created: !customer && dryRun ? false : Boolean(customer && customer.isNew) };
};

const main = async () => {
  const { dryRun, filePath } = parseArgs();

  console.log(`Mode: ${dryRun ? "DRY RUN (no database writes)" : "LIVE IMPORT"}`);
  console.log(`Excel file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at: ${filePath}`);
  }

  await connectDB();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheet found in Excel file.");
  }

  const cols = resolveColumns(worksheet);

  const summary = {
    totalRows: 0,
    imported: 0,
    willImport: 0,
    skipped: 0,
    errors: 0,
    skipReasons: {},
  };

  for (let rowNo = 2; rowNo <= worksheet.rowCount; rowNo += 1) {
    const row = worksheet.getRow(rowNo);
    if (!row || !row.hasValues) continue;

    summary.totalRows += 1;

    try {
      const customerName = readCell(row, cols.customerCol);
      const country = readCell(row, cols.countryCol);
      const starRaw = readCell(row, cols.starCol);
      const productName = readCell(row, cols.productCol);
      const comment = readCell(row, cols.descriptionCol);
      const rating = Number(starRaw);

      if (!customerName) {
        summary.skipped += 1;
        summary.skipReasons.missing_customer_name =
          (summary.skipReasons.missing_customer_name || 0) + 1;
        printRowLog(rowNo, "SKIP", "missing_customer_name");
        continue;
      }

      if (!country) {
        summary.skipped += 1;
        summary.skipReasons.missing_country = (summary.skipReasons.missing_country || 0) + 1;
        printRowLog(rowNo, "SKIP", "missing_country");
        continue;
      }

      if (!productName) {
        summary.skipped += 1;
        summary.skipReasons.missing_product_name =
          (summary.skipReasons.missing_product_name || 0) + 1;
        printRowLog(rowNo, "SKIP", "missing_product_name");
        continue;
      }

      if (!comment) {
        summary.skipped += 1;
        summary.skipReasons.missing_description =
          (summary.skipReasons.missing_description || 0) + 1;
        printRowLog(rowNo, "SKIP", "missing_description");
        continue;
      }

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        summary.skipped += 1;
        summary.skipReasons.invalid_star = (summary.skipReasons.invalid_star || 0) + 1;
        printRowLog(rowNo, "SKIP", "invalid_star", `star="${starRaw}"`);
        continue;
      }

      const product = await findProduct(productName);
      if (!product) {
        summary.skipped += 1;
        summary.skipReasons.product_not_found =
          (summary.skipReasons.product_not_found || 0) + 1;
        printRowLog(rowNo, "SKIP", "product_not_found", `product_name="${productName}"`);
        continue;
      }

      if (isDuplicateReview(product, customerName, comment)) {
        summary.skipped += 1;
        summary.skipReasons.duplicate_review = (summary.skipReasons.duplicate_review || 0) + 1;
        printRowLog(rowNo, "SKIP", "duplicate_review", `product="${product.name}"`);
        continue;
      }

      const { email } = await getOrCreateCustomer({ customerName, country, dryRun });

      const reviewPayload = {
        user_detail: {
          name: customerName,
          email,
          country,
        },
        rating,
        comment,
        visible: 1,
      };

      if (dryRun) {
        summary.willImport += 1;
        printRowLog(
          rowNo,
          "OK",
          "will_import",
          `product="${product.name}" | reviewer="${customerName}" | country="${country}"`
        );
      } else {
        product.reviews.push(reviewPayload);
        await product.save();
        summary.imported += 1;
        printRowLog(
          rowNo,
          "OK",
          "imported",
          `product="${product.name}" | reviewer="${customerName}" | country="${country}"`
        );
      }
    } catch (error) {
      summary.errors += 1;
      printRowLog(rowNo, "ERROR", "exception", error.message);
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total data rows checked: ${summary.totalRows}`);
  console.log(`Will import (dry-run): ${summary.willImport}`);
  console.log(`Imported (live): ${summary.imported}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);

  if (Object.keys(summary.skipReasons).length > 0) {
    console.log("\nSkip reason counts:");
    Object.entries(summary.skipReasons).forEach(([reason, count]) => {
      console.log(`- ${reason}: ${count}`);
    });
  }
};

main()
  .catch((error) => {
    console.error(`\nImport failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
