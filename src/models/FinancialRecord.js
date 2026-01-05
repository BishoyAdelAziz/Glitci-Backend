// models/FinancialRecord.js
const mongoose = require("mongoose");

const financialRecordSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      required: true,
      enum: [
        "client_installment",
        "employee_payment",
        "expense",
        "revenue",
        "other",
      ],
    },

    // For client installments
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: function () {
        return this.recordType === "client_installment";
      },
    },

    // For employee payments (can be standalone, not tied to project)
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: function () {
        return this.recordType === "employee_payment";
      },
    },

    // Project reference (optional, for project-related transactions)
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    category: {
      type: String,
      enum: [
        "client_payment",
        "employee_salary",
        "employee_bonus",
        "equipment",
        "software",
        "rent",
        "utilities",
        "marketing",
        "travel",
        "office_supplies",
        "other",
      ],
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "credit_card", "other"],
      default: "bank_transfer",
    },

    date: {
      type: Date,
      default: Date.now,
      required: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "reconciled"],
      default: "completed",
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    receiptUrl: {
      type: String,
      trim: true,
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

// Indexes for better query performance
financialRecordSchema.index({ recordType: 1, date: -1 });
financialRecordSchema.index({ client: 1, date: -1 });
financialRecordSchema.index({ employee: 1, date: -1 });
financialRecordSchema.index({ project: 1, date: -1 });
financialRecordSchema.index({ category: 1, date: -1 });
financialRecordSchema.index({ status: 1 });
financialRecordSchema.index({ isActive: 1 });

// Virtual to determine if it's cash in or out
financialRecordSchema.virtual("isCashIn").get(function () {
  return ["client_installment", "revenue"].includes(this.recordType);
});

financialRecordSchema.virtual("isCashOut").get(function () {
  return ["employee_payment", "expense"].includes(this.recordType);
});

// Export both schema and model for flexibility
const FinancialRecord =
  mongoose.models.FinancialRecord ||
  mongoose.model("FinancialRecord", financialRecordSchema);

module.exports = {
  schema: financialRecordSchema,
  model: FinancialRecord,
};
