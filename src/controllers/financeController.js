const asyncHandler = require("express-async-handler");
const Project = require("../models/Project");
const Service = require("../models/Service");

// @desc    Get overall financial analytics
// @route   GET /api/finance/analytics
// @access  Private (Manager/Admin)
const getFinancialAnalytics = asyncHandler(async (req, res) => {
  const projects = await Project.find().populate("services", "name category");

  // Calculate total projects completion rate
  const totalBudget = projects.reduce(
    (sum, project) => sum + project.budget,
    0
  );
  const totalPaid = projects.reduce(
    (sum, project) => sum + project.totalPaid,
    0
  );
  const overallCompletionRate =
    totalBudget > 0 ? ((totalPaid / totalBudget) * 100).toFixed(2) : 0;

  // Calculate completion rate by service category
  const serviceAnalytics = {};

  projects.forEach((project) => {
    project.services.forEach((service) => {
      if (!serviceAnalytics[service.category]) {
        serviceAnalytics[service.category] = {
          totalBudget: 0,
          totalPaid: 0,
          projectCount: 0,
          projects: [],
        };
      }

      serviceAnalytics[service.category].totalBudget += project.budget;
      serviceAnalytics[service.category].totalPaid += project.totalPaid;
      serviceAnalytics[service.category].projectCount++;
      serviceAnalytics[service.category].projects.push({
        projectId: project._id,
        projectName: project.projectName,
        budget: project.budget,
        paid: project.totalPaid,
        completionRate: project.completionRate,
      });
    });
  });

  // Calculate completion rates for each service category
  Object.keys(serviceAnalytics).forEach((category) => {
    const analytics = serviceAnalytics[category];
    analytics.completionRate =
      analytics.totalBudget > 0
        ? ((analytics.totalPaid / analytics.totalBudget) * 100).toFixed(2) + "%"
        : "0%";
  });

  // Project status breakdown
  const statusBreakdown = await Project.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalBudget: { $sum: "$budget" },
      },
    },
  ]);

  // Monthly revenue analysis
  const monthlyRevenue = await Project.aggregate([
    {
      $unwind: "$installments",
    },
    {
      $group: {
        _id: {
          year: { $year: "$installments.createdAt" },
          month: { $month: "$installments.createdAt" },
        },
        revenue: { $sum: "$installments.amount" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": -1, "_id.month": -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalProjects: projects.length,
        totalBudget,
        totalPaid,
        overallCompletionRate: overallCompletionRate + "%",
        remainingAmount: totalBudget - totalPaid,
      },
      serviceAnalytics,
      statusBreakdown,
      monthlyRevenue,
      topPerformingProjects: projects
        .sort(
          (a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate)
        )
        .slice(0, 5)
        .map((project) => ({
          id: project._id,
          name: project.projectName,
          budget: project.budget,
          paid: project.totalPaid,
          completionRate: project.completionRate,
        })),
    },
  });
});

// @desc    Get service-specific analytics
// @route   GET /api/finance/services/:category
// @access  Private (Manager/Admin)
const getServiceAnalytics = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const projects = await Project.find()
    .populate({
      path: "services",
      match: { category },
    })
    .populate("client", "name companyName");

  // Filter projects that have services in the specified category
  const relevantProjects = projects.filter(
    (project) => project.services && project.services.length > 0
  );

  const totalBudget = relevantProjects.reduce(
    (sum, project) => sum + project.budget,
    0
  );
  const totalPaid = relevantProjects.reduce(
    (sum, project) => sum + project.totalPaid,
    0
  );
  const completionRate =
    totalBudget > 0 ? ((totalPaid / totalBudget) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      category: category.charAt(0).toUpperCase() + category.slice(1),
      projectCount: relevantProjects.length,
      totalBudget,
      totalPaid,
      completionRate: completionRate + "%",
      remainingAmount: totalBudget - totalPaid,
      projects: relevantProjects.map((project) => ({
        id: project._id,
        name: project.projectName,
        client: project.client,
        budget: project.budget,
        paid: project.totalPaid,
        completionRate: project.completionRate,
        status: project.status,
      })),
    },
  });
});

// @desc    Get payment history
// @route   GET /api/finance/payments
// @access  Private (Manager/Admin)
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, projectId } = req.query;

  let matchCondition = {};

  if (projectId) {
    matchCondition._id = projectId;
  }

  const payments = await Project.aggregate([
    { $match: matchCondition },
    {
      $project: {
        projectName: 1,
        client: 1,
        deposit: 1,
        createdAt: 1,
        installments: 1,
      },
    },
    {
      $lookup: {
        from: "clients",
        localField: "client",
        foreignField: "_id",
        as: "clientInfo",
      },
    },
    {
      $unwind: "$clientInfo",
    },
  ]);

  // Flatten payment history
  const paymentHistory = [];

  payments.forEach((project) => {
    // Add deposit as payment
    paymentHistory.push({
      projectId: project._id,
      projectName: project.projectName,
      client: project.clientInfo.name,
      type: "Deposit",
      amount: project.deposit,
      date: project.createdAt,
      method: "initial",
    });

    // Add installments as payments
    project.installments.forEach((installment) => {
      paymentHistory.push({
        projectId: project._id,
        projectName: project.projectName,
        client: project.clientInfo.name,
        type: "Installment",
        amount: installment.amount,
        date: installment.createdAt,
        method: installment.method,
        description: installment.description,
      });
    });
  });

  // Filter by date range if provided
  let filteredPayments = paymentHistory;
  if (startDate || endDate) {
    filteredPayments = paymentHistory.filter((payment) => {
      const paymentDate = new Date(payment.date);
      if (startDate && paymentDate < new Date(startDate)) return false;
      if (endDate && paymentDate > new Date(endDate)) return false;
      return true;
    });
  }

  // Sort by date (newest first)
  filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  res.json({
    success: true,
    data: {
      payments: filteredPayments,
      summary: {
        totalPayments: filteredPayments.length,
        totalAmount,
        averagePayment:
          filteredPayments.length > 0
            ? (totalAmount / filteredPayments.length).toFixed(2)
            : 0,
      },
    },
  });
});

module.exports = {
  getFinancialAnalytics,
  getServiceAnalytics,
  getPaymentHistory,
};
