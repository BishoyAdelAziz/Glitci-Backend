const mongoose = require("mongoose");
const Counter = require("./counter"); // Fixed capitalization

const employeeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
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
      // unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      ref: "Department",
      required: true,
    },
    position: {
      type: String,
      ref: "Position",
      required: true,
    },
    skills: [
      {
        _id: false,
        type: String,
        ref: "Skill",
        required: true,
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

// Virtuals for populated data

employeeSchema.virtual("skillDetails", {
  ref: "Skill",
  localField: "skills",
  foreignField: "_id",
  justOne: false,
});

// Indexes
employeeSchema.index({ skills: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ email: 1 }, { unique: true });

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
