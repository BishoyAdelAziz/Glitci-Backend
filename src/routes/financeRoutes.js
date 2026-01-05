const express = require("express");
const financeController = require("../controllers/financeController");
const { validateRequest } = require("../middleware/validateRequest");
const { protect } = require("../middleware/auth");
const {
  addClientPayment,
  addEmployeePayment,
  addExpense,
} = require("../validators/projectValidator");

const router = express.Router();

// Apply auth middleware to all finance routes
router.use(protect);

// Client installment - POST /finance/projects/:projectId/client-installments
router.post(
  "/projects/:projectId/client-installments",
  validateRequest(addClientPayment),
  financeController.addClientInstallment
);

// Employee payment - POST /finance/projects/:projectId/employee-payments
router.post(
  "/projects/:projectId/employee-payments",
  validateRequest(addEmployeePayment),
  financeController.addEmployeePayment
);

// Expense - POST /finance/projects/:projectId/expenses
router.post(
  "/projects/:projectId/expenses",
  validateRequest(addExpense),
  financeController.addExpense
);

// Project finance report - GET /finance/projects/:projectId/report
router.get(
  "/projects/:projectId/report",
  financeController.getProjectFinanceReport
);

// Company finance report - GET /finance/report
router.get("/report", financeController.getCompanyFinanceReport);

// Financial dashboard - GET /finance/dashboard
router.get("/dashboard", financeController.getDashboard);

module.exports = router;
