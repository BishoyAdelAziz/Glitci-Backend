const mongoose = require("mongoose");
require("dotenv").config();

async function fixClientIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");

    // List all indexes on clients collection
    const indexes = await mongoose.connection.db
      .collection("clients")
      .indexes();
    console.log("Current indexes:", indexes);

    // Check if serialId index exists
    const serialIdIndex = indexes.find((index) => index.name === "serialId_1");

    if (serialIdIndex) {
      console.log("Found serialId index, dropping it...");
      await mongoose.connection.db
        .collection("clients")
        .dropIndex("serialId_1");
      console.log("Index dropped successfully!");
    } else {
      console.log("No serialId index found.");
    }

    // If there are still null values causing issues, update them
    const result = await mongoose.connection.db
      .collection("clients")
      .updateMany({ serialId: null }, { $unset: { serialId: "" } });
    console.log(
      `Updated ${result.modifiedCount} documents to remove serialId field`
    );

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixClientIndex();
