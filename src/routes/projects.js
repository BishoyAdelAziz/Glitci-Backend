const express = require("express");
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addClientPayment, // Replaces addInstallment
  addEmployeePayment, // New function
  getProjectFinancials,
} = require("../controllers/projectController");
const { protect, manager } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getProjects)
  .post(protect, manager, createProject);

router
  .route("/:id")
  .get(protect, getProject)
  .put(protect, manager, updateProject)
  .delete(protect, manager, deleteProject);

// New routes for adding payments
router.post("/:id/client-payments", protect, manager, addClientPayment);
router.post("/:id/employee-payments", protect, manager, addEmployeePayment);

// Route for financial summary
router.get("/:id/financials", protect, getProjectFinancials);

module.exports = router;
