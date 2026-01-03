const express = require("express");
const projectController = require("../controllers/projectController");
const { validateRequest } = require("../middleware/validateRequest");
const { protect } = require("../middleware/auth"); // Add this
const {
  createProject,
  updateProject,
  listQuery,
} = require("../validators/projectValidator");

const router = express.Router();

// Apply auth middleware to all project routes
router.use(protect);

// GET /projects - List active projects
router.get(
  "/",
  validateRequest(listQuery, "query"),
  projectController.getProjects
);

// GET /projects/all - List all projects (including inactive)
router.get(
  "/all",
  validateRequest(listQuery, "query"),
  projectController.getAllProjects
);

// POST /projects - Create project
router.post(
  "/",
  validateRequest(createProject),
  projectController.createProject
);

// GET /projects/:id - Get project by ID
router.get("/:id", projectController.getProject);

// PATCH /projects/:id - Update project
router.patch(
  "/:id",
  validateRequest(updateProject),
  projectController.updateProject
);

// DELETE /projects/:id - Soft delete project
router.delete("/:id", projectController.deleteProject);

// POST /projects/:id/restore - Restore project
router.post("/:id/restore", projectController.restoreProject);

// POST /projects/:id/client-payments - Add client payment
router.post("/:id/client-payments", projectController.addClientPayment);

// POST /projects/:id/employee-payments - Add employee payment
router.post("/:id/employee-payments", projectController.addEmployeePayment);

// POST /projects/:id/expenses - Add expense
router.post("/:id/expenses", projectController.addExpense);

// GET /projects/:id/financials - Get financial summary
router.get("/:id/financials", projectController.getFinancialSummary);

module.exports = router;
