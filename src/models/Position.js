const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Position name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Position name must be at least 2 characters"],
      maxlength: [50, "Position name cannot exceed 50 characters"],
    },
    description: { type: String, trim: true, maxlength: 200 },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for skills in this position
positionSchema.virtual("skillDetails", {
  ref: "Skill",
  localField: "skills",
  foreignField: "_id",
  justOne: false,
});

module.exports =
  mongoose.models.Position || mongoose.model("Position", positionSchema);
