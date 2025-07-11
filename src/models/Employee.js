const mongoose = require("mongoose");
const Counter = require("./counter");

const employeeSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phones: [
      {
        type: String,
        validate: {
          validator: (v) => /\d{10,15}/.test(v),
          message: "Invalid phone number format",
        },
      },
    ],
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    role: { type: String, required: true, lowercase: true, trim: true },
    skills: [String],
    availability: {
      type: String,
      enum: ["available", "busy", "on_leave"],
      default: "available",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "employeeId",
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

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
