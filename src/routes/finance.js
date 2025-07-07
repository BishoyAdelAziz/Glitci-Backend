const express = require("express");
const {
  getFinancialAnalytics,
  getServiceAnalytics,
  getPaymentHistory,
} = require("../controllers/financeController");
const { protect, manager } = require("../middleware/auth");

const router = express.Router();

router.get("/analytics", protect, manager, getFinancialAnalytics);
router.get("/services/:category", protect, manager, getServiceAnalytics);
router.get("/payments", protect, manager, getPaymentHistory);

module.exports = router;
