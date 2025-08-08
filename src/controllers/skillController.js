const asyncHandler = require("express-async-handler");
const Skill = require("../models/Skill");
const Role = require("../models/Position");

// @desc    Get all skills
// @route   GET /api/skills
// @access  Private
const getSkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find()
    .select("_id name category")
    .populate("role", "_id name");
  res.json({
    success: true,
    data: skills.map((skill) => ({
      id: skill._id,
      name: skill.name,
      category: skill.category,
    })),
  });
});

// @desc    Get single skill
// @route   GET /api/skills/:id
// @access  Private
const getSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) {
    return res.status(404).json({
      success: false,
      message: "Skill not found",
    });
  }
  res.json({
    success: true,
    data: {
      id: skill._id,
      name: skill.name,
      role: skill.role,
    },
  });
});

// @desc    Create skill
// @route   POST /api/skills
// @access  Private (Admin/Manager)
const createSkill = asyncHandler(async (req, res) => {
  const { name, category } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Category is required",
    });
  }
  const skill = await Skill.create({
    name: name.toLowerCase(),
    category: category || "technical",
  });

  res.status(201).json({
    success: true,
    data: {
      id: skill._id,
      name: skill.name,
      category: skill.category,
    },
  });
});

// @desc    Update skill
// @route   PATCH /api/skills/:id
// @access  Private (Admin/Manager)
const updateSkill = asyncHandler(async (req, res) => {
  const { name, category } = req.body;
  const skill = await Skill.findById(req.params.id);

  if (!skill) {
    return res.status(404).json({
      success: false,
      message: "Skill not found",
    });
  }

  if (name) skill.name = name.toLowerCase().trim();
  if (category) skill.category = category;
  await skill.save();

  res.json({
    success: true,
    data: {
      id: skill._id,
      name: skill.name,
      category: skill.category,
    },
  });
});

// @desc    Delete skill
// @route   DELETE /api/skills/:id
// @access  Private (Admin/Manager)
const deleteSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);

  if (!skill) {
    return res.status(404).json({
      success: false,
      message: "Skill not found",
    });
  }

  // Check if skill is used in any roles
  const rolesCount = await Role.countDocuments({ skills: skill._id });
  if (rolesCount > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete skill assigned to roles",
    });
  }

  await skill.deleteOne();
  res.json({
    success: true,
    message: "Skill deleted",
  });
});
// @desc    Get skills for a given role
// @route   GET /api/skills/by-role/:roleId
// @access  Private
const getSkillsByRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  // Optional: verify the role exists
  const roleExists = await Role.exists({ _id: roleId });
  if (!roleExists) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }

  // Find all skills whose `role` field matches
  const skills = await Skill.find({ role: roleId }).select("_id name");

  res.json({
    success: true,
    data: skills.map((s) => ({ id: s._id, name: s.name })),
  });
});

module.exports = {
  getSkills,
  getSkill,
  getSkillsByRole,
  createSkill,
  updateSkill,
  deleteSkill,
};
