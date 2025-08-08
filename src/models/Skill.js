const mongoose = require("mongoose");
const Counter = require("./counter");

const skillSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    name: {
      type: String,
      required: [true, "Skill name is required"],
      unique: true,
      trim: true,
      lowercase: true, // Enforce lowercase at schema level
      minlength: [2, "Skill name must be at least 2 characters"],
      maxlength: [50, "Skill name cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

skillSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      "skillId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq;
  }
  next();
});

// Virtual population for roles that require this skill
skillSchema.virtual("roles", {
  ref: "Role",
  localField: "_id",
  foreignField: "requiredSkills.skill",
  justOne: false,
});

module.exports = mongoose.models.Skill || mongoose.model("Skill", skillSchema);
