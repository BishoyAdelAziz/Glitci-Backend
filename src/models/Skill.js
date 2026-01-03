const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Skill name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Skill name must be at least 2 characters"],
      maxlength: [50, "Skill name cannot exceed 50 characters"],
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.models.Skill || mongoose.model("Skill", skillSchema);
