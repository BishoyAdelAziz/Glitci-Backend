const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");
const Position = require("../models/Position");

/* ------ list (paginated + searchable + filterable) ------ */
const listSkills = async (
  filters = {},
  { skip, limit } = { skip: 0, limit: 50 }
) => {
  const q = {};

  if (filters.position) q.position = filters.position;
  if (filters.search) {
    q.name = { $regex: filters.search, $options: "i" };
  }
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  const [data, count] = await Promise.all([
    Skill.find(q)
      .populate("position", "name")
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean(),
    Skill.countDocuments(q),
  ]);

  return { data, count };
};

/* ------ dropdown helper (BY POSITION) ------ */
const getSkillsByPosition = async (positionId) => {
  return Skill.find({
    position: positionId,
    isActive: true,
  })
    .select("name")
    .sort({ name: 1 })
    .lean();
};

/* ------ single CRUD ------ */
const getSkillById = async (id) => {
  const skill = await Skill.findById(id).populate("position", "name").lean();

  if (!skill) throw new AppError("Skill not found", 404);
  return skill;
};

const createSkill = async ({ name, position, isActive = true }) => {
  const skill = await Skill.create({ name, position, isActive });

  // ALSO add this skill to the position's skills array
  await Position.findByIdAndUpdate(
    position,
    { $addToSet: { skills: skill._id } }, // $addToSet prevents duplicates
    { new: true }
  );

  return skill.toObject();
};
const updateSkill = async (id, { name, position, isActive }) => {
  // Get the current skill to know its old position
  const oldSkill = await Skill.findById(id);
  if (!oldSkill) throw new AppError("Skill not found", 404);

  // If position is being changed
  if (position && position.toString() !== oldSkill.position.toString()) {
    // Remove from old position's skills array
    await Position.findByIdAndUpdate(oldSkill.position, {
      $pull: { skills: id },
    });

    // Add to new position's skills array
    await Position.findByIdAndUpdate(position, { $addToSet: { skills: id } });
  }

  // Update the skill
  const skill = await Skill.findByIdAndUpdate(
    id,
    { name, position, isActive },
    { new: true, runValidators: true }
  ).lean();

  return skill;
};
const deleteSkill = async (id) => {
  const skill = await Skill.findById(id);
  if (!skill) throw new AppError("Skill not found", 404);

  // Remove from position's skills array
  await Position.findByIdAndUpdate(skill.position, { $pull: { skills: id } });

  await skill.deleteOne();
  return { id };
};

module.exports = {
  listSkills,
  getSkillsByPosition,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
};
