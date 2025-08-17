// Create a file called fixIndex.js and run it once
require("dotenv").config();
const mongoose = require("mongoose");

async function fixIndex() {
  try {
    // Connect to your database (use your connection string)
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");

    // Get the employees collection
    const db = mongoose.connection.db;
    const collection = db.collection("employees");

    // Check current indexes
    const indexes = await collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((i) => i.name)
    );

    // Drop the problematic id_1 index
    try {
      await collection.dropIndex("id_1");
      console.log("Successfully dropped id_1 index");
    } catch (error) {
      if (error.message.includes("index not found")) {
        console.log("Index id_1 was not found (maybe already dropped)");
      } else {
        throw error;
      }
    }

    // Clean up any documents with null id
    const deleteResult = await collection.deleteMany({ id: null });
    console.log(`Deleted ${deleteResult.deletedCount} documents with null id`);

    // Check indexes after cleanup
    const indexesAfter = await collection.indexes();
    console.log(
      "Indexes after cleanup:",
      indexesAfter.map((i) => i.name)
    );

    console.log("Fix completed successfully!");
  } catch (error) {
    console.error("Error fixing index:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixIndex();
