const asyncHandler = require("express-async-handler");
const Department = require("../models/Departments");
const Role = require("../models/Position");

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().select("_id name");
  res.json({
    success: true,
    data: departments.map((dept) => ({ id: dept._id, name: dept.name })),
  });
});

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).select(
    "_id name"
  );
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }
  res.json({
    success: true,
    data: { id: department._id, name: department.name },
  });
});

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Admin/Manager)
const createDepartment = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  const department = await Department.create({
    name: name.toLowerCase().trim(),
  });

  res.status(201).json({
    success: true,
    data: { id: department._id, name: department.name },
  });
});

// @desc    Update department
// @route   PATCH /api/departments/:id
// @access  Private (Admin/Manager)
const updateDepartment = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  if (name) department.name = name.toLowerCase().trim();
  await department.save();

  res.json({
    success: true,
    data: { id: department._id, name: department.name },
  });
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin/Manager)
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  // Check if department has roles
  const rolesCount = await Role.countDocuments({ department: department._id });
  if (rolesCount > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete department with existing roles",
    });
  }

  await department.deleteOne();
  res.json({
    success: true,
    message: "Department deleted",
  });
});

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
