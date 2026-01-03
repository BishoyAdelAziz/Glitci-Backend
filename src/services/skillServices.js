const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");

const listSkills = async (
  filters = {},
  { skip, limit } = { skip: 0, limit: 50 }
) => {
  const q = {};
  if (filters.position) q.position = filters.position;
  if (filters.search)
    q.$or = [{ name: { $regex: filters.search, $options: "i" } }];
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  const [data, count] = await Promise.all([
    Skill.find(q).skip(skip).limit(limit).sort({ name: 1 }).lean(),
    Skill.countDocuments(q),
  ]);
  return { data, count };
};

const getSkillsByPosition = async (positionId) => {
  return Skill.find({ position: positionId }).sort({ name: 1 }).lean();
};

const getSkillById = async (id) => {
  const skill = await Skill.findById(id).lean();
  if (!skill) throw new AppError("Skill not found", 404);
  return skill;
};

const createSkill = async ({ name, position, isActive = true }) => {
  const skill = await Skill.create({ name, position, isActive });
  return skill.toObject();
};

const updateSkill = async (id, { name, position, isActive }) => {
  const skill = await Skill.findByIdAndUpdate(
    id,
    { name, position, isActive },
    { new: true, runValidators: true }
  ).lean();
  if (!skill) throw new AppError("Skill not found", 404);
  return skill;
};

const deleteSkill = async (id) => {
  const skill = await Skill.findById(id);
  if (!skill) throw new AppError("Skill not found", 404);
  await skill.remove();
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
