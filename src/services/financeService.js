const projectService = require("./projectService");
const AppError = require("../utils/AppError");

/* Add client installment to project */
const addClientInstallment = async (projectId, paymentData, userId) => {
  const project = await projectService.addClientPayment(
    projectId,
    paymentData,
    userId
  );
  return project;
};

/* Add employee payment to project */
const addEmployeePayment = async (projectId, paymentData, userId) => {
  const project = await projectService.addEmployeePayment(
    projectId,
    paymentData,
    userId
  );
  return project;
};

/* Add expense to project */
const addExpense = async (projectId, expenseData, userId) => {
  const project = await projectService.addExpense(
    projectId,
    expenseData,
    userId
  );
  return project;
};

/* Get project finance report */
const getProjectFinanceReport = async (projectId) => {
  try {
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const financialSummary = await projectService.getFinancialSummary(
      projectId
    );

    // Format employees array
    const employees = (project.employees || []).map((assignment) => {
      const employee = assignment.employee || {};
      return {
        id: employee._id,
        name: employee.name || "Unknown",
        email: employee.email,
        position: employee.position?.name || "Not specified",
        department: employee.department?.name || "Not assigned",
        assignment: {
          compensation: assignment.compensation || 0,
          hoursWorked: assignment.hoursWorked || 0,
          paymentStatus: assignment.paymentStatus || "pending",
          assignmentId: assignment._id,
        },
      };
    });

    // Format transactions
    const formattedTransactions = {
      clientPayments: (project.clientPayments || []).map((payment) => ({
        id: payment._id,
        amount: payment.amount,
        date: payment.date,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
        addedBy: payment.addedBy?.name || "Unknown",
      })),

      employeePayments: (project.employeePayments || []).map((payment) => ({
        id: payment._id,
        employeeId: payment.employee?._id,
        employeeName: payment.employee?.name || "Unknown",
        amount: payment.amount,
        date: payment.date,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
        addedBy: payment.addedBy?.name || "Unknown",
      })),

      expenses: (project.expenses || []).map((expense) => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        receipt: expense.receipt,
        addedBy: expense.addedBy?.name || "Unknown",
      })),
    };

    // Format the report
    const report = {
      project: {
        id: project._id,
        name: project.name,
        client: project.client
          ? {
              id: project.client._id,
              name: project.client.name,
              companyName: project.client.companyName,
              email: project.client.email,
            }
          : null,
        department: project.department?.name || "Not assigned",
        budget: project.budget,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        createdAt: project.createdAt,
      },

      financials: financialSummary,

      employees: employees, // Employees array included here

      transactions: formattedTransactions,

      summary: {
        totalEmployees: employees.length,
        totalTransactions:
          formattedTransactions.clientPayments.length +
          formattedTransactions.employeePayments.length +
          formattedTransactions.expenses.length,
        netCashFlow:
          financialSummary.moneyCollected -
          financialSummary.moneyPaid -
          financialSummary.totalExpenses,
        collectionRate:
          financialSummary.budget > 0
            ? Math.round(
                (financialSummary.moneyCollected / financialSummary.budget) *
                  100
              )
            : 0,
        costRate:
          financialSummary.budget > 0
            ? Math.round(
                (financialSummary.totalCost / financialSummary.budget) * 100
              )
            : 0,
      },
    };

    return report;
  } catch (error) {
    console.error("Error in getProjectFinanceReport:", error);
    throw error;
  }
};

/* Get company finance report */
const getCompanyFinanceReport = async (filters = {}) => {
  const projects = await projectService.listAllProjects(filters, {
    skip: 0,
    limit: 1000,
  });

  let totalBudget = 0;
  let totalCollected = 0;
  let totalPaid = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let totalEmployeeCompensation = 0;
  let totalEmployees = 0;
  let allEmployees = [];

  const projectReports = await Promise.all(
    projects.data.map(async (project) => {
      try {
        const summary = await projectService.getFinancialSummary(project._id);

        const projectDetails = await projectService.getProjectById(project._id);

        // Get employee details for this project
        const projectEmployees = (projectDetails.employees || []).map(
          (assignment) => {
            const employee = assignment.employee || {};
            return {
              id: employee._id,
              name: employee.name || "Unknown",
              email: employee.email,
              position: employee.position?.name || "Not specified",
              department: employee.department?.name || "Not assigned",
              assignment: {
                compensation: assignment.compensation || 0,
                hoursWorked: assignment.hoursWorked || 0,
                paymentStatus: assignment.paymentStatus || "pending",
              },
            };
          }
        );

        const employeeCount = projectEmployees.length;
        const projectEmployeeComp = projectEmployees.reduce(
          (sum, emp) => sum + emp.assignment.compensation,
          0
        );

        totalBudget += summary.budget || 0;
        totalCollected += summary.moneyCollected || 0;
        totalPaid += summary.moneyPaid || 0;
        totalExpenses += summary.totalExpenses || 0;
        totalProfit += summary.netProfitToDate || 0;
        totalEmployeeCompensation += projectEmployeeComp;
        totalEmployees += employeeCount;
        allEmployees.push(...projectEmployees);

        return {
          projectId: project._id,
          projectName: project.name,
          client: project.client
            ? {
                _id: project.client._id,
                name: project.client.name,
                companyName: project.client.companyName,
                email: project.client.email,
              }
            : null,
          budget: project.budget,
          status: project.status,
          employeeCount,
          employees: projectEmployees, // Employees array per project
          projectEmployeeComp,
          moneyCollected: summary.moneyCollected,
          moneyPaid: summary.moneyPaid,
          totalCost: summary.totalCost,
          grossProfit: summary.grossProfit,
          netProfitToDate: summary.netProfitToDate,
          clientBalanceDue: summary.clientBalanceDue,
          employeeBalanceDue: summary.employeeBalanceDue,
          totalEmployeeCompensation: projectEmployeeComp,
          totalExpenses: summary.totalExpenses,
        };
      } catch (error) {
        console.error(
          `Error getting financials for project ${project._id}:`,
          error
        );
        return null;
      }
    })
  );

  // Filter out null results
  const validProjectReports = projectReports.filter(
    (report) => report !== null
  );

  // Get unique employees
  const uniqueEmployeeMap = new Map();
  allEmployees.forEach((emp) => {
    if (emp.id && !uniqueEmployeeMap.has(emp.id.toString())) {
      uniqueEmployeeMap.set(emp.id.toString(), emp);
    }
  });
  const uniqueEmployees = Array.from(uniqueEmployeeMap.values());

  const report = {
    summary: {
      totalProjects: validProjectReports.length,
      totalEmployees: totalEmployees,
      uniqueEmployees: uniqueEmployees.length,
      totalBudget,
      totalCollected,
      totalPaid,
      totalExpenses,
      totalEmployeeCompensation,
      totalProfit,
      outstandingClients: Math.max(0, totalBudget - totalCollected),
      outstandingEmployees: Math.max(0, totalEmployeeCompensation - totalPaid),
      averageProfitPerProject:
        validProjectReports.length > 0
          ? Math.round(totalProfit / validProjectReports.length)
          : 0,
      averageEmployeesPerProject:
        validProjectReports.length > 0
          ? Math.round(totalEmployees / validProjectReports.length)
          : 0,
    },
    projects: validProjectReports,
    employees: uniqueEmployees, // Unique employees across all projects
  };

  return report;
};

/* Get financial dashboard */
const getDashboard = async () => {
  try {
    const activeProjects = await projectService.listProjects(
      { status: "active", isActive: true },
      { skip: 0, limit: 10 }
    );

    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalActiveEmployees = 0;
    let allEmployees = [];

    const projectsWithFinances = await Promise.all(
      activeProjects.data.map(async (project) => {
        try {
          const summary = await projectService.getFinancialSummary(project._id);
          const projectDetails = await projectService.getProjectById(
            project._id
          );

          // Get basic employee info for this project
          const projectEmployees = (projectDetails.employees || []).map(
            (assignment) => {
              const employee = assignment.employee || {};
              return {
                id: employee._id,
                name: employee.name || "Unknown",
                email: employee.email,
                position: employee.position?.name || "Not specified",
              };
            }
          );

          allEmployees.push(...projectEmployees);
          const employeeCount = projectEmployees.length;

          totalCashIn += summary.moneyCollected || 0;
          totalCashOut +=
            (summary.moneyPaid || 0) + (summary.totalExpenses || 0);
          totalActiveEmployees += employeeCount;

          return {
            id: project._id,
            name: project.name,
            client: project.client,
            budget: project.budget,
            status: project.status,
            employeeCount,
            employees: projectEmployees, // Basic employee info
            moneyCollected: summary.moneyCollected,
            moneyPaid: summary.moneyPaid,
            netProfitToDate: summary.netProfitToDate,
          };
        } catch (error) {
          console.error(
            `Error getting financials for project ${project._id}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out null results
    const validProjects = projectsWithFinances.filter(
      (project) => project !== null
    );

    // Get unique active employees
    const uniqueActiveEmployees = Array.from(
      new Map(
        allEmployees
          .filter((emp) => emp.id)
          .map((emp) => [emp.id.toString(), emp])
      ).values()
    );

    const dashboard = {
      quickStats: {
        activeProjects: validProjects.length,
        activeEmployees: totalActiveEmployees,
        uniqueActiveEmployees: uniqueActiveEmployees.length,
        totalCashIn,
        totalCashOut,
        netCashFlow: totalCashIn - totalCashOut,
        avgEmployeesPerProject:
          validProjects.length > 0
            ? Math.round(totalActiveEmployees / validProjects.length)
            : 0,
      },
      recentProjects: validProjects,
      employees: {
        totalActive: totalActiveEmployees,
        uniqueActive: uniqueActiveEmployees.length,
        list: uniqueActiveEmployees,
      },
    };

    return dashboard;
  } catch (error) {
    console.error("Error in getDashboard:", error);
    throw error;
  }
};

module.exports = {
  addClientInstallment,
  addEmployeePayment,
  addExpense,
  getProjectFinanceReport,
  getCompanyFinanceReport,
  getDashboard,
};
