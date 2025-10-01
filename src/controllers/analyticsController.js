const asyncHandler = require("express-async-handler");
const analyticsService = require("../services/analyticsService");

// @desc    Get overall financial analytics
// @route   GET /api/analytics/financeSummary
// @access  Private (Manager/Admin)
const getFinancialAnalytics = asyncHandler(async (req, res) => {
  let { queryStartDate, queryEndDate } = req.query;

  // If no date range is provided, default to the current month to date.
  if (!queryStartDate || !queryEndDate) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Format dates as 'YYYY-MM-DD' strings for consistency
    queryStartDate = firstDayOfMonth.toISOString().split("T")[0];
    queryEndDate = today.toISOString().split("T")[0];
  }

  const analyticsData = await analyticsService.getFinancialAnalytics(
    queryStartDate,
    queryEndDate
  );


  res.json({
    success: true,
    data: analyticsData
  });
});


// @desc    Get employees completion rates (based on money paid for them vs their total compensation)
// @route   GET /api/analytics/employeesCompletion
// @access  Private (Manager/Admin)
const getEmployeeCompletionRates = asyncHandler(async (req, res) => {
  const completionRates = await analyticsService.getEmployeeCompletionRates();
  
  res.json({
    success: true,
    data: completionRates
  });
});

module.exports = {
  getFinancialAnalytics,
  getEmployeeCompletionRates
};
