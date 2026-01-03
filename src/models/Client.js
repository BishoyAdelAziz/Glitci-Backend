const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
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

module.exports =
  mongoose.models.Client || mongoose.model("Client", clientSchema);
