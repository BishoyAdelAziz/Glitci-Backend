const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
serviceSchema.index({ department: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ name: 1, department: 1 }, { unique: true });

module.exports =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
