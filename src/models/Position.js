const mongoose = require("mongoose");
const Counter = require("./counter");

const PositionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: {
      type: String,
      required: [true, "Position name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Position name must be at least 2 characters"],
      maxlength: [50, "Position name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    department: {
      type: String, // Changed from Number to String
      ref: "Department",
      required: [true, "Department is required"],
    },
    skills: [
      {
        type: String, // Changed from Number to String
        ref: "Skill",
        required: [true, "At least one skill is required"],
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
  }
);

PositionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "PositionId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq.toString(); // Convert to string
  }
  next();
});
// Virtual for department details
PositionSchema.virtual("departmentDetails", {
  ref: "Department",
  localField: "department",
  foreignField: "_id",
  justOne: true,
});

// Virtual for skills details
PositionSchema.virtual("skillDetails", {
  ref: "Skill",
  localField: "skills",
  foreignField: "_id",
  justOne: false,
});

module.exports =
  mongoose.models.Position || mongoose.model("Position", PositionSchema);
