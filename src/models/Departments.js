const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    roles: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Department || mongoose.model("Department", departmentSchema);
