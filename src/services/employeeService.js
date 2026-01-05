const Employee = require("../models/Employee");
const AppError = require("../utils/AppError");
const toObjectId = require("../utils/toObjectId");
const validateIdsExist = require("../utils/validateIdsExist");
const Position = require("../models/Position");
const Skill = require("../models/Skill");

/* helpers */
const projection = "-__v";

/* list with filters */
const listEmployees = async (filters, { skip, limit }) => {
  const q = { isActive: true };

  if (filters.department) q.department = filters.department;
  if (filters.position) q.position = filters.position;
  if (filters.skill) q.skills = filters.skill;

  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Employee.find(q)
      .populate("department", "name")
      .populate("position", "name")
      .populate("skills", "name")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean({ virtuals: true }),
    Employee.countDocuments(q),
  ]);

  return { data, count };
};

/* get all employees including inactive */
const listAllEmployees = async (filters, { skip, limit }) => {
  const q = {};

  if (filters.department) q.department = filters.department;
  if (filters.position) q.position = filters.position;
  if (filters.skill) q.skills = filters.skill;
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Employee.find(q)
      .populate("department", "name")
      .populate("position", "name")
      .populate("skills", "name")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean({ virtuals: true }),
    Employee.countDocuments(q),
  ]);

  return { data, count };
};

/* single */
const getEmployeeById = async (id) => {
  const emp = await Employee.findById(id)
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name")
    .lean({ virtuals: true });

  if (!emp || emp.isActive === false)
    throw new AppError("Employee not found", 404);
  return emp;
};

/* create */
const createEmployee = async (dto) => {
  const { department, position, skills } = dto;

  // position must belong to department
  const pos = await Position.findOne({
    _id: position,
    department,
    isActive: true,
  });

  if (!pos) {
    throw new AppError("Invalid position for department", 400);
  }

  // skills must exist
  await validateIdsExist(Skill, skills, "One or more skills do not exist");

  // skills must belong to position
  const validSkillsCount = await Skill.countDocuments({
    _id: { $in: skills },
    position,
  });

  if (validSkillsCount !== skills.length) {
    throw new AppError(
      "One or more skills do not belong to this position",
      400
    );
  }

  const emp = await Employee.create({
    ...dto,
    department,
    position,
    skills,
    isActive: true,
  });

  return Employee.findById(emp._id)
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name")
    .lean();
};

/* update employee */
const updateEmployee = async (id, dto) => {
  const emp = await Employee.findById(id);

  if (!emp) throw new AppError("Employee not found", 404);

  const department = dto.department ?? emp.department;
  const position = dto.position ?? emp.position;
  const skills = dto.skills ?? emp.skills;

  const departmentId = toObjectId(department);
  const positionId = toObjectId(position);

  if (dto.department || dto.position) {
    const pos = await Position.findOne({
      _id: positionId,
      department: departmentId,
      isActive: true,
    });

    if (!pos) {
      throw new AppError("Invalid position for department", 400);
    }
  }

  if (dto.skills) {
    const skillIds = skills.map((skill) => toObjectId(skill));
    await validateIdsExist(Skill, skillIds, "One or more skills do not exist");

    const validSkillsCount = await Skill.countDocuments({
      _id: { $in: skillIds },
      position: positionId,
    });

    if (validSkillsCount !== skillIds.length) {
      throw new AppError(
        "One or more skills do not belong to this position",
        400
      );
    }
  }

  const updated = await Employee.findByIdAndUpdate(
    id,
    {
      ...dto,
      department: departmentId,
      position: positionId,
      skills: dto.skills
        ? skills.map((skill) => toObjectId(skill))
        : emp.skills,
    },
    { new: true, runValidators: true }
  )
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name")
    .lean();

  return updated;
};

/* soft delete */
const deleteEmployee = async (id) => {
  const emp = await Employee.findById(id);

  if (!emp || emp.isActive === false) {
    throw new AppError("Employee not found", 404);
  }

  await Employee.findByIdAndUpdate(id, { isActive: false });

  return { id, message: "Employee deactivated successfully" };
};

/* restore */
const restoreEmployee = async (id) => {
  const emp = await Employee.findById(id);

  if (!emp) {
    throw new AppError("Employee not found", 404);
  }

  if (emp.isActive === true) {
    throw new AppError("Employee is already active", 400);
  }

  await Employee.findByIdAndUpdate(id, { isActive: true });

  return { id, message: "Employee restored successfully" };
};

/* permanent delete */
const permanentDeleteEmployee = async (id) => {
  const emp = await Employee.findById(id);
  if (!emp) throw new AppError("Employee not found", 404);
  await emp.deleteOne();
  return { id, message: "Employee permanently deleted" };
};

/* by department */
const listEmployeesByDepartment = async (departmentId) => {
  const deptId = await toObjectId(departmentId);

  return Employee.find({
    department: deptId,
    isActive: true,
  })
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name")
    .select("-__v")
    .sort({ name: 1 })
    .lean({ virtuals: true });
};

/* bulk delete */
const bulkDelete = async (ids) => {
  const result = await Employee.updateMany(
    { _id: { $in: ids } },
    { isActive: false }
  );

  if (!result.matchedCount) {
    throw new AppError("No records found", 404);
  }

  return result;
};

module.exports = {
  listEmployees,
  listAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
  listEmployeesByDepartment,
  bulkDelete,
};
