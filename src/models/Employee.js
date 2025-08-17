const mongoose = require("mongoose");
const Counter = require("./counter"); // Fixed capitalization

const employeeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      upsert: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    departments: [
      {
        type: String,
        ref: "Department",
        required: true,
      },
    ],
    positions: [
      {
        type: String,
        ref: "Position",
        required: true,
      },
    ],
    skills: [
      {
        type: String,
        ref: "Skill",
        required: true,
      },
    ],
    projects: [
      {
        project: {
          type: String,
          ref: "Project",
        },
        budget: {
          type: Number,
          default: 0,
          min: 0,
        },
        installments: [
          {
            amount: {
              type: Number,
              required: true,
              min: 0,
            },
            date: {
              type: Date,
              default: Date.now,
            },
            addedBy: {
              type: String,
              ref: "User",
              required: true,
            },
          },
        ],
        currency: {
          type: String,
          default: "EGP",
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false, // Disable virtual id field to avoid conflicts
  }
);

// Fixed pre-save middleware with proper async handling and error handling
employeeSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "employeeId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this._id = counter.seq.toString(); // Simple numeric ID
    next();
  } catch (err) {
    console.error("Failed to generate employee ID:", err);
    // Fallback to timestamp if counter fails
    this._id = Date.now().toString();
    next();
  }
});
// Add validation to ensure ID is always set
employeeSchema.path("_id").validate(function (value) {
  return !!value && typeof value === "string" && /^\d+$/.test(value);
}, "Invalid employee ID format");

// Virtuals for populated data
employeeSchema.virtual("departmentDetails", {
  ref: "Department",
  localField: "departments",
  foreignField: "_id",
  justOne: false,
});

employeeSchema.virtual("positionDetails", {
  ref: "Position",
  localField: "positions",
  foreignField: "_id",
  justOne: false,
});

employeeSchema.virtual("skillDetails", {
  ref: "Skill",
  localField: "skills",
  foreignField: "_id",
  justOne: false,
});

employeeSchema.virtual("projectDetails", {
  ref: "Project",
  localField: "projects.project",
  foreignField: "_id",
  justOne: false,
});

// Virtual for completion rate per project
employeeSchema.virtual("completionRates").get(function () {
  return this.projects.map((project) => {
    const totalInstallments = project.installments.reduce(
      (sum, inst) => sum + inst.amount,
      0
    );
    const completionRate =
      project.budget > 0 ? (totalInstallments / project.budget) * 100 : 0;
    return {
      projectId: project.project,
      completionRate: parseFloat(completionRate.toFixed(2)),
    };
  });
});

// Indexes
employeeSchema.index({ departments: 1 });
employeeSchema.index({ positions: 1 });
employeeSchema.index({ skills: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ "projects.project": 1 });
employeeSchema.index({ email: 1 }, { unique: true });

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
