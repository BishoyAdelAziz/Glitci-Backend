const mongoose = require("mongoose");
const Counter = require("./counter");

const departmentSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // Keep serialized ID for consistency
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      lowercase: true, // Enforce lowercase at schema level
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [50, "Department name cannot exceed 50 characters"],
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

// Auto-increment department ID
departmentSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "departmentId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq.toString();
  }
  next();
});

// Virtual population for roles
departmentSchema.virtual("roles", {
  ref: "Role",
  localField: "_id",
  foreignField: "department",
  justOne: false,
});

// Virtual population for employees
departmentSchema.virtual("employees", {
  ref: "Employee",
  localField: "_id",
  foreignField: "departments",
  justOne: false,
});

module.exports =
  mongoose.models.Department || mongoose.model("Department", departmentSchema);
