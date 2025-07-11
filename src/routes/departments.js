const express = require("express");
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentRoles,
} = require("../controllers/departmentsController");
const router = express.Router();

// GET all departments
router.get("/", getDepartments);

// GET single department
router.get("/:id", getDepartment);

// GET roles for a department
router.get("/:id/roles", getDepartmentRoles);

// CREATE department
router.post("/", createDepartment);

// UPDATE department
router.patch("/:id", updateDepartment);

// DELETE department
router.delete("/:id", deleteDepartment);

module.exports = router;
