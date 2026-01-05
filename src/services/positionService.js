const Position = require("../models/Position");
const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");

const listPositions = async (
  filters = {},
  { skip = 0, limit = 10 } = {} // Accept skip as separate parameter
) => {
  const q = {};

  if (filters.department) q.department = filters.department;
  if (filters.search) {
    q.$or = [{ name: { $regex: filters.search, $options: "i" } }];
  }
  if (filters.isActive !== undefined) q.isActive = filters.isActive;
  else q.isActive = true;

  // Remove skip from filters if it somehow got there
  delete filters.skip;

  const [data, count] = await Promise.all([
    Position.find(q)
      .populate("department", "name")
      .populate("skills", "name")
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean({ virtuals: true }),
    Position.countDocuments(q),
  ]);

  return { data, count };
};

const getPositionsByDepartment = async (departmentId) => {
  return Position.find({ department: departmentId })
    .populate("skills", "name")
    .sort({ name: 1 })
    .lean({ virtuals: true });
};

const getPositionById = async (id) => {
  const pos = await Position.findById(id)
    .populate("department", "name")
    .populate("skills", "name")
    .lean({ virtuals: true });
  if (!pos) throw new AppError("Position not found", 404);
  return pos;
};

const createPosition = async ({
  name,
  description,
  department,
  skills = [], // default empty array
  isActive = true,
}) => {
  const pos = await Position.create({
    name,
    description,
    department,
    skills, // Store skill IDs
    isActive,
  });

  // If skills were provided, update them to reference this position
  if (skills.length > 0) {
    await Skill.updateMany(
      { _id: { $in: skills } },
      { $set: { position: pos._id } }
    );
  }

  return pos
    .populate(["department", { path: "skills", select: "name" }])
    .then((p) => p.toObject());
};
const updatePosition = async (id, updates) => {
  const pos = await Position.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("department", "name")
    .populate("skills", "name");
  if (!pos) throw new AppError("Position not found", 404);
  return pos;
};

const deletePosition = async (id) => {
  const pos = await Position.findById(id);
  if (!pos) throw new AppError("Position not found", 404);
  await pos.remove();
  return { id };
};

module.exports = {
  listPositions,
  getPositionsByDepartment,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
};
