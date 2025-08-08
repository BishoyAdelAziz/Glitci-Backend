const mongoose = require("mongoose");
const Counter = require("./counter");

const PositionSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    name: {
      type: String,
      required: [true, "Position name is required"],
      unique: true,
      trim: true,
      lowercase: true, // Enforce lowercase at schema level
      minlength: [2, "Position name must be at least 2 characters"],
      maxlength: [50, "Position name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    department: {
      type: Number,
      ref: "Department",
      required: [true, "Department is required"],
    },
    // Enhanced skills structure with proficiency levels

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

// Auto-increment Position ID
PositionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "PositionId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq;
  }
  next();
});

// Virtual population for department
PositionSchema.virtual("departmentDetails", {
  ref: "Department",
  localField: "department",
  foreignField: "_id name",
  justOne: true,
});

// Virtual population for employees
PositionSchema.virtual("employees", {
  ref: "Employee",
  localField: "_id",
  foreignField: "Positions.Position",
  justOne: false,
});

// Validation: Ensure all required skills exist
PositionSchema.pre("save", async function (next) {
  if (this.requiredSkills && this.requiredSkills.length > 0) {
    const Skill = mongoose.model("Skill");
    const skillIds = this.requiredSkills.map((rs) => rs.skill);
    const existingSkills = await Skill.find({ _id: { $in: skillIds } });

    if (existingSkills.length !== skillIds.length) {
      return next(new Error("One or more skills do not exist"));
    }
  }
  next();
});
module.exports =
  mongoose.models.Position || mongoose.model("Position", PositionSchema);
