const asyncHandler = require("express-async-handler");
const Project = require("../models/Project");
const Employee = require("../models/Employee");
const Service = require("../models/Service");
const Client = require("../models/Client");

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find()
    .populate("employees.employee", "name email")
    .populate("client", "name companyName email")
    .populate("services", "name category")
    .sort({ createdAt: -1 });

  const projectsWithCalculations = projects.map((project) => {
    const projectObj = project.toObject();
    projectObj.totalPaid = project.totalPaid;
    projectObj.completionRate = project.completionRate;
    return projectObj;
  });

  res.json({
    success: true,
    count: projects.length,
    data: projectsWithCalculations,
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("employees.employee", "name email phones position")
    .populate("client", "name companyName email phones")
    .populate("services", "name category description");

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const projectObj = project.toObject();
  projectObj.totalPaid = project.totalPaid;
  projectObj.completionRate = project.completionRate;

  res.json({
    success: true,
    data: projectObj,
  });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Manager/Admin)
const createProject = asyncHandler(async (req, res) => {
  const {
    projectName,
    employees,
    budget,
    deposit,
    clientId,
    services,
    startDate,
    endDate,
    deliverables,
    notes,
  } = req.body;

  // Validate client exists
  const client = await Client.findById(clientId);
  if (!client) {
    return res.status(400).json({ message: "Client not found" });
  }

  // Validate employees exist
  if (employees && employees.length > 0) {
    const employeeIds = employees.map((emp) => emp.employee);
    const existingEmployees = await Employee.find({
      _id: { $in: employeeIds },
    });
    if (existingEmployees.length !== employeeIds.length) {
      return res
        .status(400)
        .json({ message: "One or more employees not found" });
    }
  }

  // Validate services exist
  if (services && services.length > 0) {
    const existingServices = await Service.find({ _id: { $in: services } });
    if (existingServices.length !== services.length) {
      return res
        .status(400)
        .json({ message: "One or more services not found" });
    }
  }

  const project = await Project.create({
    projectName,
    employees: employees || [],
    budget,
    deposit,
    client: clientId,
    services: services || [],
    startDate,
    endDate,
    deliverables: deliverables || [],
    notes,
  });

  const populatedProject = await Project.findById(project._id)
    .populate("employees.employee", "name email")
    .populate("client", "name companyName email")
    .populate("services", "name category");

  res.status(201).json({
    success: true,
    data: populatedProject,
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Manager/Admin)
const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("employees.employee", "name email")
    .populate("client", "name companyName email")
    .populate("services", "name category");

  res.json({
    success: true,
    data: project,
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Manager/Admin)
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  await project.deleteOne();

  res.json({
    success: true,
    message: "Project deleted successfully",
  });
});

// @desc    Add installment to project
// @route   POST /api/projects/:id/installments
// @access  Private (Manager/Admin)
const addInstallment = asyncHandler(async (req, res) => {
  const { method, amount, description } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  project.installments.push({
    method,
    amount,
    description,
  });

  await project.save();

  res.json({
    success: true,
    data: project,
  });
});

// @desc    Get project financial details
// @route   GET /api/projects/:id/financials
// @access  Private
const getProjectFinancials = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const totalPaid = project.totalPaid;
  const remainingAmount = project.budget - totalPaid;
  const completionPercentage =
    project.budget > 0 ? (totalPaid / project.budget) * 100 : 0;

  res.json({
    success: true,
    data: {
      budget: project.budget,
      deposit: project.deposit,
      installments: project.installments,
      totalPaid,
      remainingAmount,
      completionPercentage: completionPercentage.toFixed(2) + "%",
      paymentHistory: [
        {
          type: "Deposit",
          amount: project.deposit,
          date: project.createdAt,
        },
        ...project.installments.map((installment) => ({
          type: "Installment",
          method: installment.method,
          amount: installment.amount,
          date: installment.createdAt,
          description: installment.description,
        })),
      ],
    },
  });
});

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addInstallment,
  getProjectFinancials,
};
