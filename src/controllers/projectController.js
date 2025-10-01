const asyncHandler = require("express-async-handler");
const Project = require("../models/Project");
const Employee = require("../models/Employee");
const Service = require("../models/Service");
const User = require("../models/User");

/**
 * @desc    Get all projects with advanced filtering
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    client,
    search,
    startDate,
    endDate,
    minBudget,
    maxBudget,
  } = req.query;

  const filter = { isActive: true };

  // Apply filters
  if (status) filter.status = status;
  if (client) filter.client = client;
  if (startDate || endDate) {
    filter.startDate = {};
    if (startDate) filter.startDate.$gte = new Date(startDate);
    if (endDate) filter.startDate.$lte = new Date(endDate);
  }
  if (minBudget || maxBudget) {
    filter.budget = {};
    if (minBudget) filter.budget.$gte = Number(minBudget);
    if (maxBudget) filter.budget.$lte = Number(maxBudget);
  }

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("employees.employee", "name position")
      .populate("services", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Project.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: projects.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: projects, // Simplified: New virtuals are included automatically
  });
});

/**
 * @desc    Get single project with full details
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("employees.employee", "name email position department")
    .populate("services", "name description price")
    .populate("createdBy", "name email")
    .populate("client_payments")
    .populate("employee_payments");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  res.json({
    success: true,
    data: project, // Simplified: New virtuals are included automatically
  });
});

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private/Manager
 */
const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    client,
    budget,
    startDate,
    endDate,
    employees,
    services,
    department
  } = req.body;

  // Validate required fields
  if (!name || !client || !budget || !startDate || !department) {
    return res.status(400).json({
      success: false,
      message: "Name, client, budget, start date and department are required",
    });
  }

  // Validate references exist
  try {
    await Promise.all([
      validateEmployees(employees?.map((e) => e.employee)),
      validateServices(services),
    ]);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const project = await Project.create({
    name,
    description,
    client,
    budget,
    startDate,
    endDate,
    employees: employees || [],
    services: services || [],
    createdBy: req.user.id,
    department
  });

  const populated = await Project.findById(project._id)
    .populate("client", "name")
    .populate("employees.employee", "name");

  res.status(201).json({
    success: true,
    data: populated,
  });
});

/**
 * @desc    Update project details
 * @route   PUT /api/projects/:id
 * @access  Private/Manager
 */
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Prevent updating payment arrays directly through this endpoint
  const { createdBy, client_payments, employee_payments, ...updateData } = req.body;

  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate("employees.employee", "name");

  res.json({
    success: true,
    data: updatedProject,
  });
});

/**
 * @desc    Add a payment from a client
 * @route   POST /api/projects/:id/client-payments
 * @access  Private/Manager
 */
const addClientPayment = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;

  if (!amount) {
    return res.status(400).json({
      success: false,
      message: "Payment amount is required",
    });
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  project.client_payments.push({
    amount,
    notes,
    addedBy: req.user.id,
  });

  await project.save();
  res.json({ success: true, data: project });
});

/**
 * @desc    Add a payment to an employee
 * @route   POST /api/projects/:id/employee-payments
 * @access  Private/Manager
 */
const addEmployeePayment = asyncHandler(async (req, res) => {
  const { employee, amount, notes } = req.body;

  if (!employee || !amount) {
    return res.status(400).json({
      success: false,
      message: "Employee and amount are required",
    });
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  project.employee_payments.push({
    employee,
    amount,
    notes,
    addedBy: req.user.id,
  });

  await project.save();
  res.json({ success: true, data: project });
});


/**
 * @desc    Get project financial summary
 * @route   GET /api/projects/:id/financials
 * @access  Private
 */
const getProjectFinancials = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("client_payments",)
    .populate("employee_payments")
    .populate("employee_payments.employee", "name");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Respond with the new, accurate financial data
  res.json({
    success: true,
    data: {
      budget: project.budget,
      totalCost: project.totalCost,
      grossProfit: project.grossProfit,
      netProfitToDate: project.netProfitToDate,
      moneyCollected: project.moneyCollected,
      moneyPaid: project.moneyPaid,
      clientBalanceDue: project.clientBalanceDue,
      employeeBalanceDue: project.employeeBalanceDue,
      client_payments: project.client_payments,
      employee_payments: project.employee_payments,
    },
  });
});

/**
 * @desc    Soft delete project
 * @route   DELETE /api/projects/:id
 * @access  Private/Admin
 */
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  project.isActive = false;
  await project.save();

  res.json({
    success: true,
    message: "Project deactivated successfully",
  });
});

const validateEmployees = async (employeeIds = []) => {
  if (employeeIds.length > 0) {
    const count = await Employee.countDocuments({
      _id: { $in: employeeIds },
      isActive: true,
    });
    if (count !== employeeIds.length) {
      throw new Error("One or more employees not found or inactive");
    }
  }
  return true;
};

const validateServices = async (serviceIds = []) => {
  if (serviceIds?.length > 0) {
    const count = await Service.countDocuments({
      _id: { $in: serviceIds },
    });
    if (count !== serviceIds.length) {
      throw new Error("One or more services not found or inactive");
    }
  }
  return true;
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addClientPayment, // Replaces addInstallment
  addEmployeePayment, // New function
  getProjectFinancials,
};
