const mongoose = require("mongoose");
const Counter = require("./counter"); // Import shared Counter model

const serviceSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["software", "marketing"],
      required: true,
    },
    description: String,
    basePrice: {
      type: Number,
      min: 0,
    },
    estimatedHours: {
      type: Number,
      min: 0,
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
serviceSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "serviceId" }, // Unique counter key for services
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
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
