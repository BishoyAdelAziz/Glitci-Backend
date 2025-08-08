const mongoose = require("mongoose");
const Counter = require("./counter");

const clientSchema = new mongoose.Schema(
  {
    serialId: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phones: [
      {
        type: String,
        validate: {
          validator: (v) => /\d{10,15}/.test(v),
          message: "Invalid phone number format",
        },
      },
    ],
    industry: String,
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
clientSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "clientId",
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
  mongoose.models.Client || mongoose.model("Client", clientSchema);
