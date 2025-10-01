const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");
const Department = require("../models/Departments");
const Position = require("../models/Position");
const Skill = require("../models/Skill");
const Project = require("../models/Project");

// --- REFACTORED VALIDATION HELPERS ---

/**
 * @desc    Validate a single department ID exists and is active
 * @param   {string} departmentId - The department ID to validate
 * @throws  {Error} If the department is not found or inactive
 */
const validateDepartment = async (departmentId) => {
  if (!departmentId) return; // Do nothing if no ID is provided
  const department = await Department.findOne({ _id: departmentId, isActive: true });
  if (!department) {
    throw new Error("Department not found or is inactive");
  }
};

/**
 * @desc    Validate a single position ID exists and is active
 * @param   {string} positionId - The position ID to validate
 * @throws  {Error} If the position is not found or inactive
 */
const validatePosition = async (positionId) => {
  if (!positionId) return;
  const position = await Position.findOne({ _id: positionId, isActive: true });
  if (!position) {
    throw new Error("Position not found or is inactive");
  }
};

/**
 * @desc    Validate skill IDs exist
 * @param   {string[]} skillIds - Array of skill IDs to validate
 * @throws  {Error} If any skill is not found
 */
const validateSkills = async (skillIds) => {
  if (!skillIds || skillIds.length === 0) return;
  const count = await Skill.countDocuments({ _id: { $in: skillIds } });
  if (count !== skillIds.length) {
    throw new Error("One or more skills not found");
  }
};

// --- UPDATED CONTROLLER FUNCTIONS ---

/**
 * @desc    Get all employees with filtering and pagination
 * @route   GET /api/employees
 * @access  Private
 */
const getEmployees = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    department,
    position,
    skill,
    search,
    isActive = true,
  } = req.query;

  const filter = { isActive };

  // Updated filter logic for single fields
  if (department) filter.department = department;
  if (position) filter.position = position;
  if (skill) filter.skills = skill;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      // Updated populate paths
      .populate("department", "name")
      .populate("position", "name")
      .populate("skills", "name"),
    Employee.countDocuments(filter),
  ]);

  // Note: The 'completionRates' virtual on the employee model is not efficient.
  // It's better to calculate this in a dedicated analytics endpoint.
  // For now, we remove the inefficient call.
  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employees,
  });
});

/**
 * @desc    Get all employees in a specific department
 * @route   GET /api/employees/department/:departmentId
 * @access  Private
 */
const getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const { page = 1, limit = 10, isActive = true } = req.query;

  await validateDepartment(departmentId); // Use the validation helper

  const filter = {
    department: departmentId, // Updated field name
    isActive: isActive === "true",
  };

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("position", "name")
      .populate("skills", "name category"),
    Employee.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employees,
  });
});

/**
 * @desc    Get single employee by ID with full details
 * @route   GET /api/employees/:id
 * @access  Private
 */
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    // Updated populate paths
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name");

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  res.json({
    success: true,
    data: employee,
  });
});

/**
 * @desc    Create a new employee
 * @route   POST /api/employees
 * @access  Private/Admin
 */
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, department, position, skills, hourlyRate } = req.body;

  if (!name || !email || !department || !position) {
    return res.status(400).json({
      success: false,
      message: "Name, email, department, and position are required",
    });
  }

  // Validate references before attempting to create
  await validateDepartment(department);
  await validatePosition(position);
  if (skills) await validateSkills(skills);

  if (await Employee.findOne({ email: email.toLowerCase() })) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  const employee = await Employee.create({
    name,
    email: email.toLowerCase(),
    department,
    position,
    skills: skills || [],
    hourlyRate,
  });

  const populatedEmployee = await Employee.findById(employee._id)
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name");

  res.status(201).json({
    success: true,
    data: populatedEmployee,
  });
});

/**
 * @desc    Update employee details
 * @route   PUT /api/employees/:id
 * @access  Private/Admin
 */
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  const { email, department, position, skills } = req.body;

  // Validate email uniqueness if changed
  if (email && email.toLowerCase() !== employee.email) {
    if (await Employee.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Email already exists" });
    }
  }

  // Validate references if being updated
  await validateDepartment(department);
await validatePosition(position);
  if (skills) await validateSkills(skills);

  const updatedEmployee = await Employee.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate("department", "name")
    .populate("position", "name")
    .populate("skills", "name");

  res.json({
    success: true,
    data: updatedEmployee,
  });
});

/**
 * @desc    Deactivate employee (soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private/Admin
 */
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  employee.isActive = false;
  await employee.save();

  res.json({
    success: true,
    message: "Employee deactivated successfully",
  });
});

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
};
