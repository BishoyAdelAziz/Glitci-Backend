const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'clientId', 'projectId'
  seq: { type: Number, default: 0 },
});

// Export the model, or existing one if already compiled
module.exports =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);
