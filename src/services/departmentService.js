const Department = require("../models/Departments");
const AppError = require("../utils/AppError");

const listDepartments = async (
  filters = {},
  { skip, limit } = { skip: 0, limit: 50 }
) => {
  const q = {};
  if (filters.search)
    q.$or = [{ name: { $regex: filters.search, $options: "i" } }];
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  const [data, count] = await Promise.all([
    Department.find(q).skip(skip).limit(limit).sort({ name: 1 }).lean(),
    Department.countDocuments(q),
  ]);
  return { data, count };
};

const getDepartmentById = async (id) => {
  const dept = await Department.findById(id).lean();
  if (!dept) throw new AppError("Department not found", 404);
  return dept;
};

const createDepartment = async ({ name, isActive = true }) => {
  const dept = await Department.create({ name, isActive });
  return dept.toObject();
};

const updateDepartment = async (id, { name, isActive }) => {
  const dept = await Department.findByIdAndUpdate(
    id,
    { name, isActive },
    { new: true, runValidators: true }
  ).lean();
  if (!dept) throw new AppError("Department not found", 404);
  return dept;
};

// departmentService.js
const deleteDepartment = async (id) => {
  const dept = await Department.findById(id);
  if (!dept) {
    throw new AppError("Department not found", 404);
  }

  await dept.deleteOne(); // ✅ FIX
};

module.exports = {
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
