const express = require("express");
const {
  getFinancialAnalytics,
  getEmployeeCompletionRates
} = require("../controllers/analyticsController");
const { protect, manager } = require("../middleware/auth");

const router = express.Router();

router.get("/financeSummary", protect, manager, getFinancialAnalytics);
router.get("/employeesCompletion", protect, manager, getEmployeeCompletionRates);

module.exports = router;
