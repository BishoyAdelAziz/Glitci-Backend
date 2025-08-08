const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  getEmployeeOptions,
} = require("../controllers/employeeController");
const { protect, manager, admin } = require("../middleware/auth");

// Protect all routes
router.use(protect);

// GET /api/employees/options - Get available options for employee creation (no auth needed for options)
router.get("/options", getEmployeeOptions);

// GET /api/employees - Get all employees
router.get("/", getEmployees);

// POST /api/employees - Create new employee (manager+ only)
router.post("/", manager, createEmployee);

// GET /api/employees/department/:departmentId - Get employees by department
router.get("/department/:departmentId", getEmployeesByDepartment);

// GET /api/employees/:id - Get single employee
router.get("/:id", getEmployee);

// PATCH /api/employees/:id - Update employee (manager+ only)
router.patch("/:id", manager, updateEmployee);

// DELETE /api/employees/:id - Delete employee (admin only)
router.delete("/:id", admin, deleteEmployee);

module.exports = router;
