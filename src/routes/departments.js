const express = require("express");
const {
  getDepartment,
  getDepartments,
  createDepartment,
  deleteDepartment,
  updateDepartment,
} = require("../controllers/departmentsController");
const router = express.Router();

// GET all departments
router.get("/", getDepartments);

// GET single department
router.get("/:id", getDepartment);

// CREATE department
router.post("/", createDepartment);

// UPDATE department
router.patch("/:id", updateDepartment);

// DELETE department
router.delete("/:id", deleteDepartment);

module.exports = router;
