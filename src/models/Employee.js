const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skill",
        required: true,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
employeeSchema.index({ skills: 1 });
employeeSchema.index({ isActive: 1 });

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
