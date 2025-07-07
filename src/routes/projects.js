const express = require("express");
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addInstallment,
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

router.post("/:id/installments", protect, manager, addInstallment);
router.get("/:id/financials", protect, getProjectFinancials);

module.exports = router;
