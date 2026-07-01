const EMPTY_PARAGRAPH_PATTERN =
  /<p\b[^>]*>(?:\s|&nbsp;|&#160;|&#xA0;|\u00a0|\u200b|<br\b[^>]*\/?>|<\/?(?:span|strong|b|em|i|u|font|small|mark|sub|sup)\b[^>]*>)*<\/p>/gi;
const EDGE_BREAK_PATTERN = /^(?:\s*<br\b[^>]*\/?>\s*)+|(?:\s*<br\b[^>]*\/?>\s*)+$/gi;
const REPEATED_BREAK_PATTERN = /(?:\s*<br\b[^>]*\/?>\s*){3,}/gi;

const sanitizeBlogDescription = (value) => {
  if (typeof value !== "string") return value || "";

  return value
    .replace(EMPTY_PARAGRAPH_PATTERN, "")
    .replace(EDGE_BREAK_PATTERN, "")
    .replace(REPEATED_BREAK_PATTERN, "<br><br>")
    .trim();
};

const sanitizeBlogContent = (content = []) => {
  if (!Array.isArray(content)) return [];

  return content.map((item) => ({
    ...item,
    title: typeof item?.title === "string" ? item.title.trim() : item?.title || "",
    description: sanitizeBlogDescription(item?.description),
  }));
};

const sanitizeBlogForResponse = (blog) => {
  if (!blog) return blog;

  const blogObject = typeof blog.toObject === "function" ? blog.toObject() : blog;

  return {
    ...blogObject,
    content: sanitizeBlogContent(blogObject.content),
  };
};

module.exports = {
  sanitizeBlogContent,
  sanitizeBlogDescription,
  sanitizeBlogForResponse,
};
