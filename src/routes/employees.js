const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  addInstallment,
  getEmployeesByDepartment,
} = require("../controllers/employeeController");

// ===== PROTECTED ROUTES =====

// GET /api/employees - Get all employees
router.get("/", getEmployees);

// GET /api/employees/department/:departmentId - Get employees by department
router.get("/department/:departmentId", getEmployeesByDepartment);

// GET /api/employees/:id - Get single employee
router.get("/:id", getEmployee);

// ===== MANAGER+ ROUTES =====

// POST /api/employees - Create new employee
router.post("/", createEmployee);

// PATCH /api/employees/:id - Update employee
router.patch("/:id", updateEmployee);

// POST /api/employees/:employeeId/projects/:projectId/installments - Add installment
router.post("/:employeeId/projects/:projectId/installments", addInstallment);

// ===== ADMIN ONLY ROUTES =====

// DELETE /api/employees/:id - Delete employee
router.delete("/:id", deleteEmployee);

module.exports = router;
