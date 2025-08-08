const asyncHandler = require("express-async-handler");
const Positions = require("../models/Position");
const Department = require("../models/Departments");
const Skill = require("../models/Skill");

// @desc    Get all Positions for a department
// @route   GET /api/Positions/department/:departmentId
// @access  Private
const getPositionsByDepartment = asyncHandler(async (req, res) => {
  const Position = await Positions.find({
    department: req.params.departmentId,
  }).populate("Positions", "_id name");

  res.json({
    success: true,
    data: Positions.map((Position) => ({
      id: Position._id,
      name: Position.name,
      Positions: Position.skills.map((skill) => ({
        id: skill._id,
        name: skill.name,
      })),
    })),
  });
});

// @desc    Get single Position
// @route   GET /api/Positions/:id
// @access  Private
const getPosition = asyncHandler(async (req, res) => {
  const Position = await Positions.findById(req.params.id)
    .populate("department", "_id name")
    .populate("skills", "_id name");
  if (!Position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  res.json({
    success: true,
    data: {
      id: Position._id,
      name: Position.name,
      department: {
        id: Position.department._id,
        name: Position.department.name,
      },
      skills: Position.skills.map((skill) => ({
        id: skill._id,
        name: skill.name,
      })),
    },
  });
});

// @desc    Create Position
// @route   POST /api/Positions
// @access  Private (Admin/Manager)
const createPosition = asyncHandler(async (req, res) => {
  const { name, departmentId, skillIds } = req.body;

  // Validate department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  // Validate skills exist
  const skills = await Skill.find({ _id: { $in: skillIds } });
  if (skills.length !== skillIds.length) {
    return res.status(400).json({
      success: false,
      message: "One or more skills not found",
    });
  }

  // Create Position
  const Position = await Positions.create({
    name,
    department: departmentId,
    skills: skillIds,
  });

  res.status(201).json({
    success: true,
    data: {
      id: Position._id,
      name: Position.name,
      department: { id: department._id, name: department.name },
      skills: skills.map((skill) => ({ id: skill._id, name: skill.name })),
    },
  });
});

// @desc    Update Position
// @route   PATCH /api/Positions/:id
// @access  Private (Admin/Manager)
const updatePosition = asyncHandler(async (req, res) => {
  const { name, departmentId, skillIds } = req.body;
  const Position = await Position.findById(req.params.id);

  if (!Position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  // Update department if provided
  if (departmentId) {
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }
    Position.department = departmentId;
  }

  // Update skills if provided
  if (skillIds) {
    const skills = await Skill.find({ _id: { $in: skillIds } });
    if (skills.length !== skillIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more skills not found",
      });
    }
    Position.skills = skillIds;
  }

  if (name) Position.name = name;
  await Position.save();

  // Get updated references
  const department = await Department.findById(Position.department).select(
    "name"
  );
  const skills = await Skill.find({ _id: { $in: Position.skills } }).select(
    "name"
  );

  res.json({
    success: true,
    data: {
      id: Position._id,
      name: Position.name,
      department: { id: department._id, name: department.name },
      skills: skills.map((skill) => ({ id: skill._id, name: skill.name })),
    },
  });
});

// @desc    Delete Position
// @route   DELETE /api/Positions/:id
// @access  Private (Admin/Manager)
const deletePosition = asyncHandler(async (req, res) => {
  const Position = await Positions.findById(req.params.id);

  if (!Position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  // Check if Position is assigned to any employees
  const employeeCount = await Employee.countDocuments({
    Position: Position._id,
  });
  if (employeeCount > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete Position assigned to employees",
    });
  }

  await Position.deleteOne();
  res.json({
    success: true,
    message: "Position deleted",
  });
});

module.exports = {
  getPositionsByDepartment,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
};
