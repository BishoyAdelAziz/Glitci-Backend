const projectService = require("../services/projectService");
const asyncHandler = require("../middleware/asyncHandler");
const { getPaginationData, paginate } = require("../utils/pagination");

// Get all active projects
exports.getProjects = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await projectService.listProjects(filters, {
    skip,
    limit,
  });

  res.json({
    success: true,
    count,
    ...paginate({ count }, page, limit),
    data,
  });
});

// Get all projects (including inactive)
exports.getAllProjects = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await projectService.listAllProjects(filters, {
    skip,
    limit,
  });

  res.json({
    success: true,
    count,
    ...paginate({ count }, page, limit),
    data,
  });
});

// Create project - FIXED: Pass userId from req.user
exports.createProject = asyncHandler(async (req, res) => {
  // Get userId from authenticated user
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const project = await projectService.createProject(req.body, userId);
  res.status(201).json({ success: true, data: project });
});

// Get single project
exports.getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
  res.json({ success: true, data: project });
});

// Update project
exports.updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body);
  res.json({ success: true, data: project });
});

// Soft delete project
exports.deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject(req.params.id);
  res.json({ success: true, data: result });
});

// Restore project
exports.restoreProject = asyncHandler(async (req, res) => {
  const result = await projectService.restoreProject(req.params.id);
  res.json({ success: true, data: result });
});

// Add client payment
exports.addClientPayment = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const project = await projectService.addClientPayment(
    req.params.id,
    req.body,
    userId
  );
  res.json({ success: true, data: project });
});

// Add employee payment
exports.addEmployeePayment = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const project = await projectService.addEmployeePayment(
    req.params.id,
    req.body,
    userId
  );
  res.json({ success: true, data: project });
});

// Add expense
exports.addExpense = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const project = await projectService.addExpense(
    req.params.id,
    req.body,
    userId
  );
  res.json({ success: true, data: project });
});

// Get financial summary
exports.getFinancialSummary = asyncHandler(async (req, res) => {
  const summary = await projectService.getFinancialSummary(req.params.id);
  res.json({ success: true, data: summary });
});
