const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [50, "Department name cannot exceed 50 characters"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for positions in this department
departmentSchema.virtual("positions", {
  ref: "Position",
  localField: "_id",
  foreignField: "department",
  justOne: false,
});

module.exports =
  mongoose.models.Department || mongoose.model("Department", departmentSchema);
