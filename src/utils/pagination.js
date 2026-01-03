const getPaginationData = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(200, Math.max(1, parseInt(limit, 10)));
  return { skip: (p - 1) * l, limit: l, page: p };
};
const paginate = ({ count }, page, limit) => {
  const totalPages = Math.ceil(count / limit);
  return { total: count, pages: totalPages, currentPage: page, limit };
};
module.exports = { getPaginationData, paginate };
