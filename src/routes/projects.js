const express = require("express");
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addInstallment,
  getProjectFinancials,
  getTotalProjectsCount,
  getTotalProjectsRevenue,
  getTotalProjectsExpenses,
  getTotalFinishedProjectsCount,
  getTotalActiveProjectsCount,
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
router.get("/stats/total-count", protect, getTotalProjectsCount);
router.get("/stats/total-revenue", protect, getTotalProjectsRevenue);
router.get("/stats/total-expenses", protect, getTotalProjectsExpenses);
router.get("/stats/finished-count", protect, getTotalFinishedProjectsCount);
router.get("/stats/active-count", protect, getTotalActiveProjectsCount);
router.post("/:id/installments", protect, manager, addInstallment);
router.get("/:id/financials", protect, getProjectFinancials);

module.exports = router;
