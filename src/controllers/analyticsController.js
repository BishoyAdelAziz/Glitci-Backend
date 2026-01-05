const analyticsService = require("../services/analyticsService");
const asyncHandler = require("../middleware/asyncHandler");

exports.financeSummary = asyncHandler(async (req, res, next) => {
  const data = await analyticsService.financeSummary();
  res.json({ success: true, data });
});
