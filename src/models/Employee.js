const mongoose = require("mongoose");
const Counter = require("./counter");

const employeeSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true, index: true },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
        message: "Please enter a valid email address",
      },
    },
    phones: [
      {
        type: String,
        required: [true, "At least one phone number is required"],
        validate: {
          validator: (v) => /^\d{10,15}$/.test(v),
          message: "Please enter a valid phone number (10-15 digits)",
        },
      },
    ],
    // Support multiple departments
    departments: [
      {
        type: Number,
        ref: "Department",
        required: true,
      },
    ],
    // Support multiple roles with additional context
    roles: [
      {
        role: {
          type: Number,
          ref: "Role",
          required: true,
        },
        startDate: {
          type: Date,
          default: Date.now,
        },
        isPrimary: {
          type: Boolean,
        },
      },
    ],
    // Enhanced skills with proficiency tracking
    skills: [
      {
        skill: {
          type: Number,
          ref: "Skill",
          required: true,
        },
      },
    ],
    hireDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Additional fields for better employee management
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-increment serialId
employeeSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "employeeId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.serialId = counter.seq;
  }
  next();
});

// Validation: At least one department is required
employeeSchema.path("departments").validate(function (departments) {
  return departments && departments.length > 0;
}, "At least one department is required");

// Validation: At least one role is required
employeeSchema.path("roles").validate(function (roles) {
  return roles && roles.length > 0;
}, "At least one role is required");

// Validation: Only one primary role allowed

// Validation: At least one skill is required
employeeSchema.path("skills").validate(function (skills) {
  return skills && skills.length > 0;
}, "At least one skill is required");

// Pre-save validation for role-department consistency
employeeSchema.pre("save", async function (next) {
  if (this.isModified("roles") || this.isModified("departments")) {
    const Role = mongoose.model("Role");

    for (const roleObj of this.roles) {
      const role = await Role.findById(roleObj.role);
      if (role && !this.departments.includes(role.department)) {
        return next(
          new Error(
            `Role ${role.name} is not available in the selected departments`
          )
        );
      }
    }
  }
  next();
});

// Virtual population for department details
employeeSchema.virtual("departmentDetails", {
  ref: "Department",
  localField: "departments",
  foreignField: "_id",
  justOne: false,
});

// Virtual population for role details
employeeSchema.virtual("roleDetails", {
  ref: "Role",
  localField: "roles.role",
  foreignField: "_id",
  justOne: false,
});

// Virtual population for skill details
employeeSchema.virtual("skillDetails", {
  ref: "Skill",
  localField: "skills.skill",
  foreignField: "_id",
  justOne: false,
});

// Virtual for primary role
employeeSchema.virtual("primaryRole").get(function () {
  const primaryRole = this.roles.find((r) => r.isPrimary);
  return primaryRole
    ? primaryRole.role
    : this.roles.length > 0
    ? this.roles[0].role
    : null;
});

// Index for better query performance
employeeSchema.index({ departments: 1 });
employeeSchema.index({ "roles.role": 1 });
employeeSchema.index({ "skills.skill": 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ availability: 1 });

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
