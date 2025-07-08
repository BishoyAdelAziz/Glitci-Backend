const mongoose = require("mongoose");
const Counter = require("./counter"); // Import shared Counter model

const employeeSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true }, // Add serialId field

    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phones: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /\d{10,15}/.test(v);
          },
          message: "Invalid phone number format",
        },
      },
    ],
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    skills: [String],
    availability: {
      type: String,
      enum: ["available", "busy", "on_leave"],
      default: "available",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-increment serialId
employeeSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "employeeId" }, // Unique counter key for employees
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.serialId = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Export model safely to avoid overwrite errors
module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
