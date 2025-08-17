const asyncHandler = require("express-async-handler");
const Department = require("../models/Departments");
const Position = require("../models/Position");

// @desc    Get all departments with their positions
// @route   GET /api/departments
// @access  Private
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().select("_id name ");
  res.json({
    success: true,
    data: departments.map((dept) => ({
      id: dept._id,
      name: dept.name,
    })),
  });
});

// @desc    Get single department with positions
// @route   GET /api/departments/:id
// @access  Private
const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).populate({
    path: "positions",
    select: "_id name description isActive",
    populate: {
      path: "skillDetails",
      select: "_id name category",
    },
  });

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  res.json({
    success: true,
    data: {
      id: department._id,
      name: department.name,
      isActive: department.isActive,
      positions: department.positions.map((pos) => ({
        id: pos._id,
        name: pos.name,
        description: pos.description,
        isActive: pos.isActive,
        skills: pos.skillDetails.map((skill) => ({
          id: skill._id,
          name: skill.name,
          category: skill.category,
        })),
      })),
    },
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
      message: "Department name is required",
    });
  }

  // Check if department already exists
  const existingDept = await Department.findOne({
    name: name.toLowerCase().trim(),
  });
  if (existingDept) {
    return res.status(400).json({
      success: false,
      message: "Department already exists",
    });
  }

  const department = await Department.create({
    name: name.toLowerCase().trim(),
  });

  res.status(201).json({
    success: true,
    data: {
      id: department._id,
      name: department.name,
      isActive: department.isActive,
    },
  });
});

// @desc    Update department
// @route   PATCH /api/departments/:id
// @access  Private (Admin/Manager)
const updateDepartment = asyncHandler(async (req, res) => {
  const { name, isActive } = req.body;
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  if (name) {
    // Check if new name already exists
    const existingDept = await Department.findOne({
      name: name.toLowerCase().trim(),
      _id: { $ne: department._id },
    });
    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: "Department name already exists",
      });
    }
    department.name = name.toLowerCase().trim();
  }

  if (typeof isActive !== "undefined") {
    department.isActive = isActive;

    // Optionally deactivate all positions when department is deactivated
    if (!isActive) {
      await Position.updateMany(
        { department: department._id },
        { $set: { isActive: false } }
      );
    }
  }

  await department.save();

  res.json({
    success: true,
    data: {
      id: department._id,
      name: department.name,
      isActive: department.isActive,
    },
  });
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  // Check if department has positions
  const positionsCount = await Position.countDocuments({
    department: department._id,
  });

  if (positionsCount > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot delete department with existing positions. Deactivate it instead.",
    });
  }

  await department.deleteOne();

  res.json({
    success: true,
    message: "Department deleted successfully",
  });
});

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
