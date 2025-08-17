const mongoose = require("mongoose");
require("dotenv").config();

async function getDbName() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Get the database name
    const dbName = mongoose.connection.db.databaseName;
    console.log("Database name:", dbName);

    // Alternative way
    const db = mongoose.connection.db;
    console.log("Database name (alternative):", db.databaseName);

    return dbName;
  } catch (error) {
    console.error("Error getting database name:", error);
  } finally {
    // Disconnect if needed
    await mongoose.disconnect();
  }
}

// Run the function
getDbName().then((dbName) => {
  console.log("Your database name is:", dbName);
});
