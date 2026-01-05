const financeService = require("../services/financeService");
const AppError = require("../utils/AppError");

/* Add client installment to project */
const addClientInstallment = async (req, res, next) => {
  try {
    const project = await financeService.addClientInstallment(
      req.params.projectId,
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: project,
      message: "Client installment added successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* Add employee payment to project */
const addEmployeePayment = async (req, res, next) => {
  try {
    const project = await financeService.addEmployeePayment(
      req.params.projectId,
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: project,
      message: "Employee payment added successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* Add expense to project */
const addExpense = async (req, res, next) => {
  try {
    const project = await financeService.addExpense(
      req.params.projectId,
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: project,
      message: "Expense added successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* Get project finance report */
const getProjectFinanceReport = async (req, res, next) => {
  try {
    const report = await financeService.getProjectFinanceReport(
      req.params.projectId
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/* Get company finance report */
const getCompanyFinanceReport = async (req, res, next) => {
  try {
    const report = await financeService.getCompanyFinanceReport(req.query);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/* Get financial dashboard */
const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await financeService.getDashboard();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addClientInstallment,
  addEmployeePayment,
  addExpense,
  getProjectFinanceReport,
  getCompanyFinanceReport,
  getDashboard,
};
