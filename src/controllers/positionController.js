const asyncHandler = require("express-async-handler");
const Position = require("../models/Position");
const Department = require("../models/Departments");
const Skill = require("../models/Skill");
const Employee = require("../models/Employee");

// @desc    Get all active positions for a department
// @route   GET /api/positions/department/:departmentId
// @access  Private
const getPositionsByDepartment = asyncHandler(async (req, res) => {
  // First check if department exists
  const department = await Department.findById(req.params.departmentId);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department does not exist",
    });
  }

  // If department exists, fetch its positions
  const positions = await Position.find({
    department: req.params.departmentId,
    isActive: true,
  })
    .select("_id name description isActive")
    .populate({
      path: "skillDetails",
      select: "_id name category",
    });

  res.json({
    success: true,
    data: positions.map((position) => ({
      id: position._id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
      skills: position.skillDetails.map((skill) => ({
        id: skill._id,
        name: skill.name,
        category: skill.category,
      })),
    })),
  });
});

// @desc    Get single position with full details
// @route   GET /api/positions/:id
// @access  Private
const getPosition = asyncHandler(async (req, res) => {
  const position = await Position.findById(req.params.id)
    .populate("departmentDetails", "_id name isActive")
    .populate("skillDetails", "_id name category");

  if (!position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  res.json({
    success: true,
    data: {
      id: position._id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
      department: {
        id: position.departmentDetails._id,
        name: position.departmentDetails.name,
        isActive: position.departmentDetails.isActive,
      },
      skills: position.skillDetails.map((skill) => ({
        id: skill._id,
        name: skill.name,
        category: skill.category,
      })),
    },
  });
});

// @desc    Create new position
// @route   POST /api/positions
// @access  Private (Admin/Manager)
const createPosition = asyncHandler(async (req, res) => {
  const { name, description, departmentId, skillIds } = req.body;

  // Validate department exists and is active
  const department = await Department.findOne({
    _id: departmentId,
    isActive: true,
  });
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Active department not found",
    });
  }

  // Validate skills exist
  if (!skillIds || skillIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one skill is required",
    });
  }

  const skills = await Skill.find({
    _id: { $in: skillIds },
    isActive: true,
  });

  if (skills.length !== skillIds.length) {
    return res.status(400).json({
      success: false,
      message: "One or more skills not found or inactive",
    });
  }

  // Check if position name already exists in department
  const existingPosition = await Position.findOne({
    name: name.toLowerCase().trim(),
    department: departmentId,
  });

  if (existingPosition) {
    return res.status(400).json({
      success: false,
      message: "Position with this name already exists in the department",
    });
  }

  // Create position
  const position = await Position.create({
    name: name.toLowerCase().trim(),
    description,
    department: departmentId,
    skills: skillIds,
  });

  // Get the created position with populated data
  const newPosition = await Position.findById(position._id)
    .populate("departmentDetails", "_id name")
    .populate("skillDetails", "_id name category");

  res.status(201).json({
    success: true,
    data: {
      id: newPosition._id,
      name: newPosition.name,
      description: newPosition.description,
      department: {
        id: newPosition.departmentDetails._id,
        name: newPosition.departmentDetails.name,
      },
      skills: newPosition.skillDetails.map((skill) => ({
        id: skill._id,
        name: skill.name,
        category: skill.category,
      })),
    },
  });
});

// @desc    Update position
// @route   PATCH /api/positions/:id
// @access  Private (Admin/Manager)
const updatePosition = asyncHandler(async (req, res) => {
  const { name, description, departmentId, skillIds, isActive } = req.body;
  const position = await Position.findById(req.params.id);

  if (!position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  // Update department if provided
  if (departmentId) {
    const department = await Department.findOne({
      _id: departmentId,
      isActive: true,
    });
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Active department not found",
      });
    }
    position.department = departmentId;
  }

  // Update skills if provided
  if (skillIds) {
    const skills = await Skill.find({
      _id: { $in: skillIds },
      isActive: true,
    });
    if (skills.length !== skillIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more skills not found or inactive",
      });
    }
    position.skills = skillIds;
  }

  // Update other fields
  if (name) position.name = name.toLowerCase().trim();
  if (description) position.description = description;
  if (typeof isActive !== "undefined") position.isActive = isActive;

  await position.save();

  // Get updated position with populated data
  const updatedPosition = await Position.findById(position._id)
    .populate("departmentDetails", "_id name")
    .populate("skillDetails", "_id name category");

  res.json({
    success: true,
    data: {
      id: updatedPosition._id,
      name: updatedPosition.name,
      description: updatedPosition.description,
      isActive: updatedPosition.isActive,
      department: {
        id: updatedPosition.departmentDetails._id,
        name: updatedPosition.departmentDetails.name,
      },
      skills: updatedPosition.skillDetails.map((skill) => ({
        id: skill._id,
        name: skill.name,
        category: skill.category,
      })),
    },
  });
});

// @desc    Delete position
// @route   DELETE /api/positions/:id
// @access  Private (Admin)
const deletePosition = asyncHandler(async (req, res) => {
  const position = await Position.findById(req.params.id);

  if (!position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  // Check if position is assigned to any employees
  const employeeCount = await Employee.countDocuments({
    "positions.position": position._id,
  });

  if (employeeCount > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot delete position assigned to employees. Deactivate it instead.",
    });
  }

  await position.deleteOne();

  res.json({
    success: true,
    message: "Position deleted successfully",
  });
});

module.exports = {
  getPositionsByDepartment,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
};
