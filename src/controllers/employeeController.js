const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");
const Department = require("../models/Departments");
const Position = require("../models/Position");
const Skill = require("../models/Skill");
const Project = require("../models/Project");
const Counter = require("../models/counter");
const mongoose = require("mongoose");
/**
 * @desc    Validate department IDs exist and are active
 * @param   {string[]} departmentIds - Array of department IDs to validate
 * @return  {Promise<Array>} Array of valid departments
 * @throws  {Error} If any department is not found or inactive
 */
const validateDepartments = async (departmentIds) => {
  const departments = await Department.find({
    _id: { $in: departmentIds },
    isActive: true,
  });
  if (departments.length !== departmentIds.length) {
    throw new Error("One or more departments not found or inactive");
  }
  return departments;
};

/**
 * @desc    Validate position IDs exist and are active
 * @param   {string[]} positionIds - Array of position IDs to validate
 * @return  {Promise<Array>} Array of valid positions
 * @throws  {Error} If any position is not found or inactive
 */
const validatePositions = async (positionIds) => {
  const positions = await Position.find({
    _id: { $in: positionIds },
    isActive: true,
  });
  if (positions.length !== positionIds.length) {
    throw new Error("One or more positions not found or inactive");
  }
  return positions;
};

/**
 * @desc    Validate skill IDs exist and are active
 * @param   {string[]} skillIds - Array of skill IDs to validate
 * @return  {Promise<Array>} Array of valid skills
 * @throws  {Error} If any skill is not found or inactive
 */
const validateSkills = async (skillIds) => {
  const skills = await Skill.find({
    _id: { $in: skillIds },
  });
  if (skills.length !== skillIds.length) {
    throw new Error("One or more skills not found or inactive");
  }
  return skills;
};

/**
 * @desc    Validate project IDs exist and are active
 * @param   {string[]} projectIds - Array of project IDs to validate
 * @return  {Promise<Array>} Array of valid projects
 * @throws  {Error} If any project is not found or inactive
 */
const validateProjects = async (projectIds) => {
  const projects = await Project.find({
    _id: { $in: projectIds },
    isActive: true,
  });
  if (projects.length !== projectIds.length) {
    throw new Error("One or more projects not found or inactive");
  }
  return projects;
};

/**
 * @desc    Get all employees with filtering and pagination
 * @route   GET /api/employees
 * @access  Private
 * @param   {string} [department] - Filter by department ID
 * @param   {string} [position] - Filter by position ID
 * @param   {string} [skill] - Filter by skill ID
 * @param   {string} [project] - Filter by project ID
 * @param   {string} [search] - Search by name or email
 * @param   {boolean} [isActive=true] - Filter by active status
 * @param   {number} [page=1] - Page number
 * @param   {number} [limit=10] - Items per page
 * @return  {Object} Paginated list of employees with completion rates
 */
const getEmployees = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    department,
    position,
    skill,
    project,
    search,
    isActive = true,
  } = req.query;

  const filter = { isActive };

  if (department) filter.departments = department;
  if (position) filter.positions = position;
  if (skill) filter.skills = skill;
  if (project) filter["projects.project"] = project;

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
      .limit(limit)
      .populate("departmentDetails", "name")
      .populate("positionDetails", "name")
      .populate("skillDetails", "name")
      .populate("projectDetails", "name"),
    Employee.countDocuments(filter),
  ]);

  // Calculate completion rates for each employee
  const employeesWithCompletion = employees.map((employee) => ({
    ...employee.toObject(),
    completionRates: employee.completionRates,
  }));

  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employeesWithCompletion,
  });
});
/**
 * @desc    Get all employees in a specific department
 * @route   GET /api/employees/department/:departmentId
 * @access  Private
 * @param   {string} departmentId - Department ID to filter by
 * @param   {number} [page=1] - Page number for pagination
 * @param   {number} [limit=10] - Number of items per page
 * @param   {boolean} [isActive=true] - Filter by active status
 * @return  {Object} Paginated list of employees in the department with completion rates
 */
const getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const { page = 1, limit = 10, isActive = true } = req.query;

  // Validate department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  // Build query filter
  const filter = {
    departments: departmentId,
    isActive: isActive === "true", // Convert string to boolean
  };

  // Execute queries in parallel
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("positionDetails", "name")
      .populate("skillDetails", "name category")
      .populate({
        path: "projects.project",
        select: "name budget",
      }),
    Employee.countDocuments(filter),
  ]);

  // Calculate completion rates for each employee
  const employeesWithCompletion = employees.map((employee) => ({
    ...employee.toObject(),
    completionRates: employee.completionRates,
  }));

  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employeesWithCompletion,
  });
});
// @desc    Get single employee with full details
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate("departmentDetails", "name")
    .populate("positionDetails", "name")
    .populate("skillDetails", "name")
    .populate("projectDetails", "name budget")
    .populate("projects.installments.addedBy", "name");

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  // Add completion rates to the response
  const employeeData = {
    ...employee.toObject(),
    completionRates: employee.completionRates,
  };

  res.json({
    success: true,
    data: employeeData,
  });
});

// @desc    Create employee
// Quick fix for createEmployee function
const createEmployee = asyncHandler(async (req, res) => {
  try {
    const { name, email, departments, positions, skills } = req.body;

    // Validate required fields
    if (!name || !email || !departments || !positions || !skills) {
      return res.status(400).json({
        success: false,
        message: "Name, email, departments, positions, and skills are required",
      });
    }

    // Check email uniqueness
    if (await Employee.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Create employee - ID will be auto-generated
    const employee = new Employee({
      name,
      email: email.toLowerCase(),
      departments,
      positions,
      skills,
      projects: [],
    });

    await employee.save();

    // Populate response data
    const populatedEmployee = await Employee.findById(employee._id)
      .populate("departmentDetails", "name")
      .populate("positionDetails", "name")
      .populate("skillDetails", "name");

    res.status(201).json({
      success: true,
      data: populatedEmployee,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate key error - please try again",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating employee: " + error.message,
    });
  }
});
/**
 * @desc    Get single employee by ID with full details
 * @route   GET /api/employees/:id
 * @access  Private
 * @param   {string} id - Employee ID
 * @return  {Object} Employee details with populated references and completion rates
 */
const updateEmployee = asyncHandler(async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const { email, departments, positions, skills, projects } = req.body;

    // Validate email uniqueness if changed
    if (email && email !== employee.email) {
      if (
        await Employee.findOne({
          email: email.toLowerCase(),
          _id: { $ne: employee._id },
        })
      ) {
        throw new Error("Email already exists");
      }
    }

    // Validate references if being updated
    if (departments) await validateDepartments(departments);
    if (positions) await validatePositions(positions);
    if (skills) await validateSkills(skills);
    if (projects) await validateProjects(projects.map((p) => p.project));

    /**
     * @desc    Update employee details
     * @route   PATCH /api/employees/:id
     * @access  Private/Admin
     * @param   {string} id - Employee ID
     * @param   {Object} updateData - Fields to update
     * @return  {Object} Updated employee with populated references
     */
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("departmentDetails", "name")
      .populate("positionDetails", "name")
      .populate("skillDetails", "name");

    res.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @desc    Add installment to employee's project
 * @route   POST /api/employees/:employeeId/projects/:projectId/installments
 * @access  Private/Manager
 * @param   {string} employeeId - Employee ID
 * @param   {string} projectId - Project ID
 * @param   {number} amount - Installment amount in EGP
 * @param   {string} addedBy - User ID who added the installment
 * @return  {Object} Updated employee with new installment
 */
const addInstallment = asyncHandler(async (req, res) => {
  const { employeeId, projectId } = req.params;
  const { amount, addedBy } = req.body;

  try {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Find the project
    const projectIndex = employee.projects.findIndex(
      (p) => p.project.toString() === projectId
    );

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Project not found for this employee",
      });
    }

    // Add installment
    employee.projects[projectIndex].installments.push({
      amount,
      addedBy,
      date: new Date(),
    });

    await employee.save();

    // Get updated employee with populated data
    const updatedEmployee = await Employee.findById(employeeId)
      .populate("projects.project", "name")
      .populate("projects.installments.addedBy", "name");

    res.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @desc    Deactivate employee (soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private/Admin
 * @param   {string} id - Employee ID
 * @return  {Object} Success message
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
  addInstallment,
  deleteEmployee,
  getEmployeesByDepartment,
};
