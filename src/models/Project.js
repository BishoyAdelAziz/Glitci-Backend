// models/Project.js
const mongoose = require("mongoose");

// models/Project.js - Update the employeeAssignmentSchema
const employeeAssignmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  compensation: {
    type: Number,
    required: true,
    min: 0,
  },
  hoursWorked: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "paid"],
    default: "pending",
  },
});

const clientPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "bank_transfer", "check", "credit_card", "other"],
    default: "bank_transfer",
  },
  reference: {
    type: String,
    trim: true,
  },
});

const employeePaymentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "bank_transfer", "check", "credit_card", "other"],
    default: "bank_transfer",
  },
});

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ["equipment", "software", "travel", "marketing", "office", "other"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receipt: {
    type: String, // URL to receipt file
    trim: true,
  },
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    employees: [employeeAssignmentSchema],
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],

    // Financials
    clientPayments: [clientPaymentSchema],
    employeePayments: [employeePaymentSchema],
    expenses: [expenseSchema],

    // Calculated fields
    moneyCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    moneyPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossProfit: {
      type: Number,
      default: 0,
    },
    netProfitToDate: {
      type: Number,
      default: 0,
    },
    clientBalanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    employeeBalanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total employee compensation
projectSchema.virtual("totalEmployeeCompensation").get(function () {
  if (!this.employees) return 0;
  return this.employees.reduce((sum, emp) => sum + (emp.compensation || 0), 0);
});

// Virtual for total expenses
projectSchema.virtual("totalExpensesAmount").get(function () {
  if (!this.expenses) return 0;
  return this.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
});

// Pre-save middleware to calculate financials
projectSchema.pre("save", function (next) {
  // Calculate total money collected from client
  this.moneyCollected = this.clientPayments
    ? this.clientPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      )
    : 0;

  // Calculate total money paid to employees
  this.moneyPaid = this.employeePayments
    ? this.employeePayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      )
    : 0;

  // Calculate total cost (employee compensation + expenses)
  const totalEmployeeComp = this.employees
    ? this.employees.reduce((sum, emp) => sum + (emp.compensation || 0), 0)
    : 0;

  const totalExpenses = this.expenses
    ? this.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    : 0;

  this.totalCost = totalEmployeeComp + totalExpenses;

  // Calculate gross profit (budget - total cost)
  this.grossProfit = this.budget - this.totalCost;

  // Calculate net profit to date (money collected - money paid - expenses)
  this.netProfitToDate = this.moneyCollected - this.moneyPaid - totalExpenses;

  // Calculate client balance due (budget - money collected)
  this.clientBalanceDue = Math.max(0, this.budget - this.moneyCollected);

  // Calculate employee balance due (total employee comp - money paid)
  this.employeeBalanceDue = Math.max(0, totalEmployeeComp - this.moneyPaid);

  next();
});

// Indexes
projectSchema.index({ client: 1 });
projectSchema.index({ department: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ isActive: 1 });
projectSchema.index({ createdBy: 1 });

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
