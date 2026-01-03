const Project = require('../models/project');
const AppError = require('../utils/AppError');

const financeSummary = async () => {
  const [summary] = await Project.aggregate([
    { $match: { isActive: true } },
    {
      $addFields: {
        moneyCollected: { $sum: '$client_payments.amount' },
        moneyPaid: { $sum: '$employee_payments.amount' },
        totalCost: { $sum: '$employees.compensation' },
      },
    },
    {
      $group: {
        _id: null,
        totalBudget: { $sum: '$budget' },
        totalCollected: { $sum: '$moneyCollected' },
        totalPaid: { $sum: '$moneyPaid' },
        totalCost: { $sum: '$totalCost' },
        projectCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalBudget: 1,
        totalCollected: 1,
        totalPaid: 1,
        totalCost: 1,
        projectCount: 1,
        grossProfit: { $subtract: ['$totalBudget', '$totalCost'] },
        netProfitToDate: { $subtract: ['$totalCollected', '$totalPaid'] },
        clientBalanceDue: { $subtract: ['$totalBudget', '$totalCollected'] },
        employeeBalanceDue: { $subtract: ['$totalCost', '$totalPaid'] },
      },
    },
  ]);
  if (!summary) throw new AppError('No active projects', 404);
  return summary;
};

module.exports = { financeSummary };
