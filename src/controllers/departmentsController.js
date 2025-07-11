const asyncHandler = require("express-async-handler");
const Department = require("../models/Departments.js");

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().select("name roles services");
  res.json({ success: true, data: departments });
});

// @desc    Get a single department
// @route   GET /api/departments/:id
// @access  Private
const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).select(
    "name roles services"
  );
  if (!department) {
    return res
      .status(404)
      .json({ success: false, message: "Department not found" });
  }
  res.json({ success: true, data: department });
});

// @desc    Create a department
// @route   POST /api/departments
// @access  Private (Admin/Manager)
const createDepartment = asyncHandler(async (req, res) => {
  const { name, roles, services } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }
  const department = await Department.create({
    name: name.toLowerCase().trim(),
    roles: roles || [],
    services: services || [],
  });
  res.status(201).json({ success: true, data: department });
});

// @desc    Update a department
// @route   PATCH /api/departments/:id
// @access  Private (Admin/Manager)
const updateDepartment = asyncHandler(async (req, res) => {
  const { name, roles, services } = req.body;
  const department = await Department.findById(req.params.id);
  if (!department) {
    return res
      .status(404)
      .json({ success: false, message: "Department not found" });
  }
  if (name) department.name = name.toLowerCase().trim();
  if (Array.isArray(roles)) department.roles = roles;
  if (Array.isArray(services)) department.services = services;
  await department.save();
  res.json({ success: true, data: department });
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private (Admin/Manager)
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    return res
      .status(404)
      .json({ success: false, message: "Department not found" });
  }
  await department.deleteOne();
  res.json({ success: true, message: "Department deleted" });
});

// @desc    Get roles for a specific department
// @route   GET /api/departments/:id/roles
// @access  Private
const getDepartmentRoles = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).select(
    "name roles"
  );
  if (!department) {
    return res
      .status(404)
      .json({ success: false, message: "Department not found" });
  }
  res.json({
    success: true,
    data: { department: department.name, roles: department.roles },
  });
});

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentRoles,
};
