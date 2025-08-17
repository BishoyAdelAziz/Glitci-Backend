require("dotenv").config();
const mongoose = require("mongoose");
const Counter = require("./src/models/counter");

async function resetCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await Counter.findOneAndUpdate(
      { _id: "employeeId" },
      { $set: { seq: 0 } },
      { upsert: true, new: true }
    );

    console.log(`Employee counter reset to: ${result.seq}`);
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
}

resetCounter();
