const mongoose = require("mongoose");
const Counter = require("./counter");

const installmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Installment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    method: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["cash", "bank_transfer", "check", "card", "digital_wallet"],
        message: "Invalid payment method",
      },
    },
    date: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Added by user is required"],
    },
    receiptNumber: String,
    notes: String,
  },
  { _id: true, timestamps: true }
);

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
      ref: "Client",
      required: [true, "Client reference is required"],
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget cannot be negative"],
    },
    currency: {
      type: String,
      default: "EGP",
      enum: ["EGP", "USD", "EUR"],
      uppercase: true,
    },
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
        employee: {
          type: String,
          ref: "Employee",
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        hourlyRate: Number,
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    installments: [installmentSchema],
    services: [
      {
        type: String,
        ref: "Service",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
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

// Virtual for total paid amount
projectSchema.virtual("totalPaid").get(function () {
  const installmentsTotal =
    this.installments?.reduce((sum, i) => sum + i.amount, 0) || 0;
  return installmentsTotal;
});

// Virtual for completion percentage
projectSchema.virtual("completionRate").get(function () {
  if (this.budget <= 0) return 0;
  return parseFloat(((this.totalPaid / this.budget) * 100).toFixed(2));
});

// Virtual for remaining balance
projectSchema.virtual("remainingBalance").get(function () {
  return this.budget - this.totalPaid;
});

// Indexes for better performance
projectSchema.index({ name: "text", description: "text" });
projectSchema.index({ status: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ "employees.employee": 1 });
projectSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
