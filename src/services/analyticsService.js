const Project = require("../models/Project");
const Employee = require("../models/Employee");

const getFinancialAnalytics = async (queryStartDate, queryEndDate) => {
  const qStart = new Date(queryStartDate);
  const qEnd = new Date(queryEndDate);
  qEnd.setDate(qEnd.getDate() + 1); // Set to start of next day for an inclusive range

  // 1. Define the match condition for active projects in the date range
  const dateMatch = {
    status: { $in: ["planning", "active", "on_hold"] },
    $or: [
      {
        endDate: { $ne: null },
        startDate: { $lt: qEnd },
        endDate: { $gte: qStart },
      },
      {
        endDate: null,
        startDate: { $lt: qEnd },
      },
    ],
  };

  // 2. Define a common projection stage to filter payments by date range
  const paymentProjection = {
    $project: {
      department: 1,
      budget: 1,
      totalCost: 1,
      status: 1,
      moneyCollectedInRange: {
        $sum: {
          $map: {
            input: {
              $filter: {
                input: "$client_payments",
                as: "payment",
                cond: {
                  $and: [
                    { $gte: ["$$payment.date", qStart] },
                    { $lt: ["$$payment.date", qEnd] },
                  ],
                },
              },
            },
            as: "filteredPayment",
            in: "$$filteredPayment.amount",
          },
        },
      },
      moneyPaidInRange: {
        $sum: {
          $map: {
            input: {
              $filter: {
                input: "$employee_payments",
                as: "payment",
                cond: {
                  $and: [
                    { $gte: ["$$payment.date", qStart] },
                    { $lt: ["$$payment.date", qEnd] },
                  ],
                },
              },
            },
            as: "filteredPayment",
            in: "$$filteredPayment.amount",
          },
        },
      },
    },
  };

  // 3. Define pipelines for all analytics
  const overviewPipeline = [
    { $match: dateMatch },
    paymentProjection,
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        totalRevenue: { $sum: "$budget" },
        totalCost: { $sum: "$totalCost" },
        totalMoneyCollected: { $sum: "$moneyCollectedInRange" },
        totalMoneyPaid: { $sum: "$moneyPaidInRange" },
      },
    },
    {
      $project: {
        _id: 0,
        totalProjects: 1,
        totalRevenue: 1,
        totalCost: 1,
        totalGrossProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
        totalMoneyCollected: 1,
        totalMoneyPaid: 1,
        totalNetProfitToDate: {
          $subtract: ["$totalMoneyCollected", "$totalMoneyPaid"],
        },
      },
    },
  ];

  const departmentAnalyticsPipeline = [
    { $match: dateMatch },
    paymentProjection,
    {
      $group: {
        _id: "$department",
        projectCount: { $sum: 1 },
        totalRevenue: { $sum: "$budget" },
        totalCost: { $sum: "$totalCost" },
        totalMoneyCollected: { $sum: "$moneyCollectedInRange" },
        totalMoneyPaid: { $sum: "$moneyPaidInRange" },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "departmentInfo",
      },
    },
    { $unwind: { path: "$departmentInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        department: { $ifNull: ["$departmentInfo.name", "Unassigned"] },
        projectCount: 1,
        totalRevenue: 1,
        totalCost: 1,
        totalGrossProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
        totalMoneyCollected: 1,
        totalMoneyPaid: 1,
        totalNetProfitToDate: {
          $subtract: ["$totalMoneyCollected", "$totalMoneyPaid"],
        },
      },
    },
    { $sort: { totalNetProfitToDate: -1 } },
  ];

  // 4. Run all analytics in parallel
  const [overviewResult, departmentAnalytics, activeEmployees] =
    await Promise.all([
      Project.aggregate(overviewPipeline),
      Project.aggregate(departmentAnalyticsPipeline),
      Employee.countDocuments({ isActive: true }),
    ]);

  // 5. Structure the final response
  const ProjectsOverview = overviewResult[0] || {
    totalProjects: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalGrossProfit: 0,
    totalMoneyCollected: 0,
    totalMoneyPaid: 0,
    totalNetProfitToDate: 0,
  };

  return {
    ProjectsOverview,
    departmentAnalytics,
    activeEmployees,
  };
};

const getEmployeeCompletionRates = async () => {
  const rates = await Employee.aggregate([
    {
      $match: { isActive: true }, // Start with active employees
    },
    {
      // Step 1: For each employee, calculate their total expected earnings (compensation) across all projects.
      $lookup: {
        from: "projects",
        let: { employeeId: "$_id" },
        pipeline: [
          { $unwind: "$employees" },
          {
            $match: {
              $expr: { $eq: ["$employees.employee", "$$employeeId"] },
            },
          },
          {
            $group: {
              _id: "$employees.employee",
              totalCompensation: { $sum: "$employees.compensation" },
            },
          },
        ],
        as: "compensationData",
      },
    },
    {
      // NEW STEP: Filter out employees who are not assigned to any project.
      // An employee is considered "assigned" if their compensation data is not an empty array.
      $match: {
        compensationData: { $ne: [] },
      },
    },
    {
      // Step 2: For each employee, calculate the total amount they have been paid across all projects.
      $lookup: {
        from: "projects",
        let: { employeeId: "$_id" },
        pipeline: [
          { $unwind: "$employee_payments" },
          {
            $match: {
              $expr: { $eq: ["$employee_payments.employee", "$$employeeId"] },
            },
          },
          {
            $group: {
              _id: "$employee_payments.employee",
              totalPaid: { $sum: "$employee_payments.amount" },
            },
          },
        ],
        as: "paymentData",
      },
    },
    {
      $unwind: { path: "$compensationData" }, // We can now do a simple unwind
    },
    {
      $unwind: { path: "$paymentData", preserveNullAndEmptyArrays: true }, // Keep this in case an employee has compensation but hasn't been paid yet
    },
    {
      // Step 3: Project the final results and calculate the completion rate.
      $project: {
        _id: 0,
        employeeId: "$_id",
        employeeName: "$name",
        employeeImage: "$image", // Assuming employee model has an image field
        totalCompensation: "$compensationData.totalCompensation",
        totalPaid: { $ifNull: ["$paymentData.totalPaid", 0] },
        completionRate: {
          $multiply: [
            {
              $divide: [
                { $ifNull: ["$paymentData.totalPaid", 0] },
                "$compensationData.totalCompensation",
              ],
            },
            100,
          ],
        },
      },
    },
    {
      $sort: { completionRate: -1 },
    },
  ]);

  return rates;
};

module.exports = {
  getFinancialAnalytics,
  getEmployeeCompletionRates,
};
