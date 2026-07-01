const { sanitizeBlogDescription } = require("./blogContentSanitizer");

const sanitizeProductAnchorTags = (rawValue) => {
  if (!rawValue) return [];

  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        label: (item?.label || "").trim(),
        url: (item?.url || "").trim(),
      }))
      .filter((item) => item.label && item.url);
  } catch (error) {
    return [];
  }
};

const sanitizeDescriptionBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((item) => ({
    ...item,
    title: typeof item?.title === "string" ? item.title.trim() : item?.title || "",
    description: sanitizeBlogDescription(item?.description),
  }));
};

const sanitizeProductPayload = (product = {}) => {
  const sanitized = { ...product };

  if (sanitized.description !== undefined) {
    sanitized.description = sanitizeBlogDescription(sanitized.description);
  }

  if (sanitized.key_benefits !== undefined) {
    sanitized.key_benefits = sanitizeDescriptionBlocks(sanitized.key_benefits);
  }

  if (sanitized.product_description !== undefined) {
    sanitized.product_description = sanitizeDescriptionBlocks(sanitized.product_description);
  }

  if (sanitized.anchor_tags !== undefined) {
    sanitized.anchor_tags = sanitizeProductAnchorTags(sanitized.anchor_tags);
  }

  return sanitized;
};

const sanitizeProductForResponse = (product) => {
  if (!product) return product;

  const productObject = typeof product.toObject === "function" ? product.toObject() : product;
  return sanitizeProductPayload(productObject);
};

module.exports = {
  sanitizeProductAnchorTags,
  sanitizeProductForResponse,
  sanitizeProductPayload,
};
