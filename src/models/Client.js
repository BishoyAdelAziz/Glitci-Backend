const mongoose = require("mongoose");
// Counter schema and model for auto-incrementing serialId
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'clientId'
  seq: { type: Number, default: 0 },
});

const Counter = require("./counter"); // Import shared Counter model

const clientSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
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
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    industry: String,
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);
clientSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "clientId" },
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

module.exports = mongoose.model("Client", clientSchema);
