// services/projectService.js
const Project = require("../models/Project");
const AppError = require("../utils/AppError");
const Client = require("../models/Client");
const Department = require("../models/Departments");
const Employee = require("../models/Employee");
const Service = require("../models/Service");
const User = require("../models/User");

/* helpers */
const projection = "-__v";

/* list with filters */
const listProjects = async (filters, { skip, limit }) => {
  const q = { isActive: true };

  if (filters.client) q.client = filters.client;
  if (filters.department) q.department = filters.department;
  if (filters.status) q.status = filters.status;
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  // Budget range filter
  if (filters.minBudget || filters.maxBudget) {
    q.budget = {};
    if (filters.minBudget) q.budget.$gte = filters.minBudget;
    if (filters.maxBudget) q.budget.$lte = filters.maxBudget;
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    q.startDate = {};
    if (filters.startDate) q.startDate.$gte = new Date(filters.startDate);
    if (filters.endDate) q.startDate.$lte = new Date(filters.endDate);
  }

  // Search filter
  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Project.find(q)
      .populate("client", "name companyName email")
      .populate("department", "name")
      .populate("employees.employee", "name email position")
      .populate("services", "name description price")
      .populate("createdBy", "name email")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true }),
    Project.countDocuments(q),
  ]);

  return { data, count };
};

/* single */
const createProject = async (dto, userId) => {
  const {
    client,
    department,
    employees = [],
    services = [],
    ...projectData
  } = dto;

  // Validate client exists
  const clientExists = await Client.findById(client);
  if (!clientExists) {
    throw new AppError("Client not found", 400);
  }

  // Validate department exists
  const departmentExists = await Department.findById(department);
  if (!departmentExists) {
    throw new AppError("Department not found", 400);
  }

  // Validate employees exist, are active, and belong to the project's department
  if (employees.length > 0) {
    const employeeIds = employees.map((emp) => emp.employee);

    // Get employees with their positions
    const employeeDocs = await Employee.find({
      _id: { $in: employeeIds },
      isActive: true,
    }).populate("position", "name");

    if (employeeDocs.length !== employeeIds.length) {
      throw new AppError(
        "One or more employees are not found or inactive",
        400
      );
    }

    // Optional: Validate that employees belong to the project's department
    // You can add this validation if needed:
    // const employeesInDept = employeeDocs.filter(emp =>
    //   emp.department.toString() === department
    // );
    // if (employeesInDept.length !== employeeIds.length) {
    //   throw new AppError("One or more employees do not belong to the selected department", 400);
    // }
  }

  // Validate services exist
  if (services.length > 0) {
    const validServices = await Service.countDocuments({
      _id: { $in: services },
    });

    if (validServices !== services.length) {
      throw new AppError("One or more services are not found", 400);
    }
  }

  // Create project
  const project = await Project.create({
    ...projectData,
    client,
    department,
    employees,
    services,
    createdBy: userId,
  });

  // Return populated project with employee positions
  return Project.findById(project._id)
    .populate("client", "name companyName email")
    .populate("department", "name")
    .populate({
      path: "employees.employee",
      select: "name email",
      populate: {
        path: "position",
        select: "name",
      },
    })
    .populate("services", "name description price")
    .populate("createdBy", "name email")
    .lean({ virtuals: true });
};

// Also update the getProjectById function to populate positions:
const getProjectById = async (id) => {
  const project = await Project.findById(id)
    .populate("client", "name companyName email phones industry")
    .populate("department", "name")
    .populate({
      path: "employees.employee",
      select: "name email department",
      populate: [
        {
          path: "position",
          select: "name",
        },
        {
          path: "department",
          select: "name",
        },
      ],
    })
    .populate("services", "name description price")
    .populate("clientPayments.addedBy", "name email")
    .populate("employeePayments.addedBy", "name email")
    .populate({
      path: "employeePayments.employee",
      select: "name email",
      populate: {
        path: "position",
        select: "name",
      },
    })
    .populate("expenses.addedBy", "name email")
    .populate("createdBy", "name email")
    .lean({ virtuals: true });

  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }
  return project;
};
/* update */
const updateProject = async (id, dto) => {
  const project = await Project.findById(id);
  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }

  const { client, department, employees, services, ...updateData } = dto;

  // Validate client if provided
  if (client) {
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      throw new AppError("Client not found", 400);
    }
    updateData.client = client;
  }

  // Validate department if provided
  if (department) {
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      throw new AppError("Department not found", 400);
    }
    updateData.department = department;
  }

  // Validate employees if provided
  if (employees) {
    const employeeIds = employees.map((emp) => emp.employee);
    const validEmployees = await Employee.countDocuments({
      _id: { $in: employeeIds },
      isActive: true,
    });

    if (validEmployees !== employeeIds.length) {
      throw new AppError(
        "One or more employees are not found or inactive",
        400
      );
    }
    updateData.employees = employees;
  }

  // Validate services if provided
  if (services) {
    const validServices = await Service.countDocuments({
      _id: { $in: services },
    });

    if (validServices !== services.length) {
      throw new AppError("One or more services are not found", 400);
    }
    updateData.services = services;
  }

  // Update project
  const updated = await Project.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("client", "name companyName email")
    .populate("department", "name")
    .populate("employees.employee", "name email position")
    .populate("services", "name description price")
    .populate("createdBy", "name email")
    .lean({ virtuals: true });

  return updated;
};

/* soft delete */
const deleteProject = async (id) => {
  const project = await Project.findById(id);
  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }

  await Project.findByIdAndUpdate(id, { isActive: false });
  return { id, message: "Project deactivated successfully" };
};

/* restore */
const restoreProject = async (id) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.isActive === true) {
    throw new AppError("Project is already active", 400);
  }

  await Project.findByIdAndUpdate(id, { isActive: true });
  return { id, message: "Project restored successfully" };
};

/* add client payment */
const addClientPayment = async (projectId, paymentData, userId) => {
  const project = await Project.findById(projectId);
  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 400);
  }

  const payment = {
    ...paymentData,
    addedBy: userId,
  };

  project.clientPayments.push(payment);
  await project.save();

  return getProjectById(projectId);
};

/* add employee payment */
const addEmployeePayment = async (projectId, paymentData, userId) => {
  const project = await Project.findById(projectId);
  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 400);
  }

  // Verify employee exists and is assigned to project
  const employee = await Employee.findById(paymentData.employee);
  if (!employee || !employee.isActive) {
    throw new AppError("Employee not found or inactive", 400);
  }

  const isEmployeeInProject = project.employees.some(
    (emp) => emp.employee.toString() === paymentData.employee
  );
  if (!isEmployeeInProject) {
    throw new AppError("Employee is not assigned to this project", 400);
  }

  const payment = {
    ...paymentData,
    addedBy: userId,
  };

  project.employeePayments.push(payment);
  await project.save();

  return getProjectById(projectId);
};

/* add expense */
const addExpense = async (projectId, expenseData, userId) => {
  const project = await Project.findById(projectId);
  if (!project || project.isActive === false) {
    throw new AppError("Project not found", 404);
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 400);
  }

  const expense = {
    ...expenseData,
    addedBy: userId,
  };

  project.expenses.push(expense);
  await project.save();

  return getProjectById(projectId);
};

/* get financial summary */
const getFinancialSummary = async (projectId) => {
  const project = await getProjectById(projectId);

  const totalEmployeeComp = project.employees.reduce(
    (sum, emp) => sum + emp.compensation,
    0
  );

  const totalExpenses = project.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return {
    budget: project.budget,
    moneyCollected: project.moneyCollected,
    moneyPaid: project.moneyPaid,
    totalCost: project.totalCost,
    grossProfit: project.grossProfit,
    netProfitToDate: project.netProfitToDate,
    clientBalanceDue: project.clientBalanceDue,
    employeeBalanceDue: project.employeeBalanceDue,
    totalEmployeeCompensation: totalEmployeeComp,
    totalExpenses: totalExpenses,
  };
};

/* get all projects (including inactive) */
const listAllProjects = async (filters, { skip, limit }) => {
  const q = {};

  if (filters.client) q.client = filters.client;
  if (filters.department) q.department = filters.department;
  if (filters.status) q.status = filters.status;
  if (filters.isActive !== undefined) q.isActive = filters.isActive;

  // Budget range filter
  if (filters.minBudget || filters.maxBudget) {
    q.budget = {};
    if (filters.minBudget) q.budget.$gte = filters.minBudget;
    if (filters.maxBudget) q.budget.$lte = filters.maxBudget;
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    q.startDate = {};
    if (filters.startDate) q.startDate.$gte = new Date(filters.startDate);
    if (filters.endDate) q.startDate.$lte = new Date(filters.endDate);
  }

  // Search filter
  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Project.find(q)
      .populate("client", "name companyName email")
      .populate("department", "name")
      .populate("employees.employee", "name email position")
      .populate("services", "name description price")
      .populate("createdBy", "name email")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true }),
    Project.countDocuments(q),
  ]);

  return { data, count };
};

module.exports = {
  listProjects,
  listAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  addClientPayment,
  addEmployeePayment,
  addExpense,
  getFinancialSummary,
};
