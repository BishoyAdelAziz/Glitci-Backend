const mongoose = require("mongoose");
const Counter = require("./counter");

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String }, // Using string ID with counter
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    client: {
      type: String,
      required: [true, "Client reference is required"],
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget cannot be negative"],
    },
    client_payments: [
      {
        _id: false,
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    employee_payments: [
      {
        _id: false,
        employee: { type: String, ref: "Employee", required: true },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: String,
        addedBy: { type: String, ref: "User", required: true },
      },
    ],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: Date,
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    employees: [
      {
        _id: false,
        employee: {
          type: String,
          ref: "Employee",
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        compensation: {
          type: Number,
          required: true,
          default: 0,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    department:{type: String, ref: "Department", required: true },
    services: [
      {
        _id: false,
        type: String,
        ref: "Service",
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-increment string ID
projectSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "projectId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq.toString();
  }
  next();
});

// --- FINANCIAL VIRTUALS ---

// Total money RECEIVED from the client so far.
projectSchema.virtual("moneyCollected").get(function () {
  return this.client_payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
});

// Total money PAID to employees so far.
projectSchema.virtual("moneyPaid").get(function () {
  return this.employee_payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
});

// The project's total EXPECTED profit.
projectSchema.virtual("grossProfit").get(function () {
  return this.budget - this.totalCost;
});

// The project's CURRENT cash-flow profit.
projectSchema.virtual("netProfitToDate").get(function () {
  return this.moneyCollected - this.moneyPaid;
});

// How much the client still owes you.
projectSchema.virtual("clientBalanceDue").get(function () {
  return this.budget - this.moneyCollected;
});

// How much you still owe your employees.
projectSchema.virtual("employeeBalanceDue").get(function () {
  return this.totalCost - this.moneyPaid;
});

// Total cost of the project based on employee compensations.
projectSchema.virtual("totalCost").get(function () {
  if (!this.employees || this.employees.length === 0) {
    return 0;
  }
  return this.employees.reduce((sum, emp) => sum + emp.compensation, 0);
});

// Indexes for better performance
projectSchema.index({ name: "text", description: "text" });
projectSchema.index({ status: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ "employees.employee": 1 });
projectSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
