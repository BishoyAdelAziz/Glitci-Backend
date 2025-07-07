const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
const getEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find({ isActive: true }).sort({ name: 1 });

  res.json({
    success: true,
    count: employees.length,
    data: employees,
  });
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({
    success: true,
    data: employee,
  });
});

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (Manager/Admin)
const createEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.create(req.body);

  res.status(201).json({
    success: true,
    data: employee,
  });
});

// @desc    Update employee
// @route   PATCH /api/employees/:id
// @access  Private (Manager/Admin)
const updateEmployee = asyncHandler(async (req, res) => {
  let employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: employee,
  });
});

// @desc    Delete employee (soft delete)
// @route   DELETE /api/employees/:id
// @access  Private (Manager/Admin)
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  employee.isActive = false;
  await employee.save();

  res.json({
    success: true,
    message: "Employee deactivated successfully",
  });
});

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
