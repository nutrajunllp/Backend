const axios = require("axios");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const START_PAGE = Number.parseInt(process.env.START_PAGE || "1", 10);
const MAX_PAGES = Number.parseInt(process.env.MAX_PAGES || "0", 10);
const ITEMS_PER_PAGE = Number.parseInt(process.env.ITEMS_PER_PAGE || "10", 10);
const PRODUCT_TYPE = process.env.PRODUCT_TYPE || "0";

if (!["0", "1"].includes(PRODUCT_TYPE)) {
  throw new Error("PRODUCT_TYPE must be 0 or 1");
}

const extraParams = { ...process.env };

const buildParams = (pageNo) => {
  const params = {
    page_no: pageNo,
    items_per_page: ITEMS_PER_PAGE,
    productType: PRODUCT_TYPE,
  };

  if (extraParams.STATUS) params.status = extraParams.STATUS;
  if (extraParams.CATEGORY) params.category = extraParams.CATEGORY;
  if (extraParams.MIN_PRICE) params.minPrice = extraParams.MIN_PRICE;
  if (extraParams.MAX_PRICE) params.maxPrice = extraParams.MAX_PRICE;
  if (extraParams.QTY) params.qty = extraParams.QTY;
  if (extraParams.STOCK_AVAILABILITY) params.stock_availability = extraParams.STOCK_AVAILABILITY;

  return params;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  let pageNo = START_PAGE;
  let totalPages = null;
  let previousIds = new Set();
  const seenIds = new Set();

  while (true) {
    const { data: response } = await axios.get(
      `${API_BASE_URL}/customer/product/all`,
      { params: buildParams(pageNo) }
    );

    const payload = response?.data || [];
    const pagination = response?.pagination || {};
    const ids = payload.map((item) => String(item._id));
    const uniqueIds = new Set(ids);

    assert(uniqueIds.size === ids.length, `Duplicate _id found within page ${pageNo}`);
    for (const id of ids) {
      assert(!previousIds.has(id), `Overlap found between page ${pageNo - 1} and page ${pageNo}: ${id}`);
    }

    assert(pagination.page_no === pageNo, `pagination.page_no mismatch on page ${pageNo}`);
    assert(pagination.items_per_page === ITEMS_PER_PAGE, `items_per_page mismatch on page ${pageNo}`);
    assert(pagination.current_page_item === ids.length, `current_page_item mismatch on page ${pageNo}`);

    if (totalPages === null) {
      totalPages = pagination.total_pages;
      const expectedTotalPages = Math.ceil((pagination.total_items || 0) / ITEMS_PER_PAGE);
      assert(totalPages === expectedTotalPages, "total_pages calculation mismatch");
    } else {
      assert(pagination.total_pages === totalPages, `total_pages changed on page ${pageNo}`);
    }

    ids.forEach((id) => seenIds.add(id));
    previousIds = uniqueIds;

    if (MAX_PAGES > 0 && pageNo >= START_PAGE + MAX_PAGES - 1) break;
    if (totalPages === 0 || pageNo >= totalPages) break;

    pageNo += 1;
  }

  console.log(
    `OK: checked pages ${START_PAGE}..${pageNo} (items_per_page=${ITEMS_PER_PAGE}, productType=${PRODUCT_TYPE}), unique IDs seen=${seenIds.size}.`
  );
};

run().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
