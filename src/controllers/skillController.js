const asyncHandler = require("express-async-handler");
const Skill = require("../models/Skill");
const Position = require("../models/Position");

// @desc    Get all skills with their position and department info
// @route   GET /api/skills
// @access  Private
const getSkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find().populate({
    path: "positionDetails",
    select: "_id name",
    populate: {
      path: "departmentDetails",
      select: "_id name",
    },
  });

  res.json({
    success: true,
    data: skills.map((skill) => ({
      id: skill._id,
      name: skill.name,
      position: {
        id: skill.positionDetails._id,
        name: skill.positionDetails.name,
        department: {
          id: skill.positionDetails.departmentDetails._id,
          name: skill.positionDetails.departmentDetails.name,
        },
      },
    })),
  });
});

// @desc    Get single skill with position and department info
// @route   GET /api/skills/:id
// @access  Private
const getSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id).populate({
    path: "positionDetails",
    select: "_id name description",
    populate: {
      path: "departmentDetails",
      select: "_id name",
    },
  });

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
      position: {
        id: skill.positionDetails._id,
        name: skill.positionDetails.name,
        description: skill.positionDetails.description,
        department: {
          id: skill.positionDetails.departmentDetails._id,
          name: skill.positionDetails.departmentDetails.name,
        },
      },
    },
  });
});
// @desc    Create skill and assign to positions (only new associations)
// @route   POST /api/skills
// @access  Private (Admin/Manager)
const createSkill = asyncHandler(async (req, res) => {
  const { name, positionId } = req.body;

  if (!name || !positionId) {
    return res.status(400).json({
      success: false,
      message: "Skill name and position ID are required",
    });
  }

  // Convert to array if single positionId provided
  const positionIds = Array.isArray(positionId) ? positionId : [positionId];
  const normalizedName = name.toLowerCase().trim();

  try {
    // Verify all positions exist
    const positions = await Position.find({ _id: { $in: positionIds } });
    if (positions.length !== positionIds.length) {
      const missingIds = positionIds.filter(
        (id) => !positions.some((p) => p._id.equals(id))
      );
      return res.status(404).json({
        success: false,
        message: `Positions not found: ${missingIds.join(", ")}`,
      });
    }

    // Check which positions already have this skill
    const existingSkills = await Skill.find({
      name: normalizedName,
      position: { $in: positionIds },
    });

    const existingPositionIds = existingSkills.map((s) =>
      s.position.toString()
    );
    const newPositionIds = positionIds.filter(
      (id) => !existingPositionIds.includes(id.toString())
    );

    // Create skills only for new positions
    const createdSkills = await Promise.all(
      newPositionIds.map(async (pid) => {
        const skill = await Skill.create({
          name: normalizedName,
          position: pid,
        });

        // Add skill to position's skills array
        await Position.findByIdAndUpdate(pid, {
          $addToSet: { skills: skill._id },
        });

        return skill;
      })
    );

    // Combine results
    const allSkills = [...existingSkills, ...createdSkills];

    res.status(201).json({
      success: true,
      data: {
        skillName: normalizedName,
        associations: allSkills.map((s) => ({
          skillId: s._id,
          positionId: s.position,
        })),
      },
    });
  } catch (error) {
    console.error("Skill creation failed:", error);
    res.status(500).json({
      success: false,
      message: "Error creating skill",
      error: error.message,
    });
  }
});
// @desc    Update skill
// @route   PATCH /api/skills/:id
// @access  Private (Admin/Manager)
const updateSkill = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const skill = await Skill.findById(req.params.id);

  if (!skill) {
    return res.status(404).json({
      success: false,
      message: "Skill not found",
    });
  }

  if (name) {
    // Check if new name already exists for this position
    const existingSkill = await Skill.findOne({
      name: name.toLowerCase().trim(),
      position: skill.position,
      _id: { $ne: skill._id },
    });

    if (existingSkill) {
      return res.status(400).json({
        success: false,
        message: "Skill name already exists for this position",
      });
    }

    skill.name = name.toLowerCase().trim();
    await skill.save();
  }

  res.json({
    success: true,
    data: {
      id: skill._id,
      name: skill.name,
      positionId: skill.position,
    },
  });
});

// @desc    Delete skill
// @route   DELETE /api/skills/:id
// @access  Private (Admin)
const deleteSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);

  if (!skill) {
    return res.status(404).json({
      success: false,
      message: "Skill not found",
    });
  }

  // Remove skill from position's skills array
  await Position.findByIdAndUpdate(skill.position, {
    $pull: { skills: skill._id },
  });

  await skill.deleteOne();

  res.json({
    success: true,
    message: "Skill deleted successfully",
  });
});

// @desc    Get skills for a specific position
// @route   GET /api/skills/by-position/:positionId
// @access  Private
const getSkillsByPosition = asyncHandler(async (req, res) => {
  const { positionId } = req.params;

  // Verify the position exists
  const position = await Position.findById(positionId);
  if (!position) {
    return res.status(404).json({
      success: false,
      message: "Position not found",
    });
  }

  // Get all skills for this position
  const skills = await Skill.find({ position: positionId });

  res.json({
    success: true,
    data: skills.map((skill) => ({
      id: skill._id,
      name: skill.name,
    })),
  });
});

module.exports = {
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByPosition,
};
