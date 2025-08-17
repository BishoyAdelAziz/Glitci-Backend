const mongoose = require("mongoose");
const Counter = require("./counter");

const skillSchema = new mongoose.Schema(
  {
    _id: { type: String }, // Changed from Number to String
    name: {
      type: String,
      required: [true, "Skill name is required"],
      unique: false,
      trim: true,
      lowercase: true,
      minlength: [2, "Skill name must be at least 2 characters"],
      maxlength: [50, "Skill name cannot exceed 50 characters"],
    },
    position: {
      type: String, // Changed from Number to String
      ref: "Position",
      required: [true, "Position reference is required"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

skillSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "skillId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq.toString(); // Convert to string
  }
  next();
});
// Virtual for position details (includes department info)
skillSchema.virtual("positionDetails", {
  ref: "Position",
  localField: "position",
  foreignField: "_id",
  justOne: true,
  populate: {
    path: "departmentDetails",
    select: "_id name",
  },
});

// Derived department virtual (no need to store separately)
skillSchema.virtual("department", {
  ref: "Position",
  localField: "position",
  foreignField: "_id",
  justOne: true,
  select: "department",
});

// Index for faster position-based queries
skillSchema.index({ name: 1, position: 1 }, { unique: true });

module.exports = mongoose.models.Skill || mongoose.model("Skill", skillSchema);
