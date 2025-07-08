const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");
const department = require("../models/Departments.js");
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
  const { department, position } = req.body;

  // Normalize inputs (optional, depending on frontend)
  const deptName = department.toLowerCase().trim();
  const roleName = position.toLowerCase().trim();

  // Find or create department and role
  let dept = await Department.findOne({ name: deptName });
  if (!dept) {
    dept = new Department({ name: deptName, roles: [roleName] });
    await dept.save();
  } else if (!dept.roles.includes(roleName)) {
    dept.roles.push(roleName);
    await dept.save();
  }

  // Create employee with normalized department and position
  const employee = await Employee.create({
    ...req.body,
    department: deptName,
    position: roleName,
  });

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

  const { department, position } = req.body;

  if (department && position) {
    const deptName = department.toLowerCase().trim();
    const roleName = position.toLowerCase().trim();

    let dept = await Department.findOne({ name: deptName });
    if (!dept) {
      dept = new Department({ name: deptName, roles: [roleName] });
      await dept.save();
    } else if (!dept.roles.includes(roleName)) {
      dept.roles.push(roleName);
      await dept.save();
    }

    req.body.department = deptName;
    req.body.position = roleName;
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
