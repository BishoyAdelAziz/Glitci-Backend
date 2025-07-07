const mongoose = require("mongoose");
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'projectId'
  seq: { type: Number, default: 0 },
});

const Counter = require("./counter");
const installmentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["cash", "bank_transfer", "check", "card"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  description: String,
});

const projectSchema = new mongoose.Schema(
  {
    serialId: {
      type: Number,
      unique: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    employees: [
      {
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          required: true,
        },
        role: String,

        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    deposit: {
      type: Number,
      required: true,
      min: 0,
    },
    installments: [installmentSchema],
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["planning", "in_progress", "completed", "cancelled"],
      default: "planning",
    },
    startDate: Date,
    endDate: Date,
    deliverables: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);
// Serialzed id for Each Project
projectSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "projectId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.serialId = counter.seq;
  }
  next();
});
// Virtual for total paid amount
projectSchema.virtual("totalPaid").get(function () {
  const installmentTotal = this.installments.reduce(
    (sum, installment) => sum + installment.amount,
    0
  );
  return this.deposit + installmentTotal;
});

// Virtual for completion rate
projectSchema.virtual("completionRate").get(function () {
  const total = this.totalPaid;
  return this.budget > 0
    ? ((total / this.budget) * 100).toFixed(2) + "%"
    : "0%";
});

// Ensure virtuals are included when converting to JSON
projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Project", projectSchema);
