#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

async function nuclearClean() {
  console.log("☢️  NUCLEAR CLEAN - This will delete ALL data!");
  console.log('Type "DELETE ALL" to confirm:');

  // Wait for confirmation
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question("", async (answer) => {
    if (answer === "DELETE ALL") {
      await mongoose.connect(process.env.MONGODB_URI);

      console.log("💥 Deleting everything...");

      const collections = ["departments", "positions", "skills", "employees"];

      for (const collection of collections) {
        try {
          await mongoose.connection.db.collection(collection).deleteMany({});
          console.log(`✅ Deleted all ${collection}`);
        } catch (err) {
          console.log(`ℹ️  ${collection}: ${err.message}`);
        }
      }

      console.log("\n💀 Database completely wiped!");
    } else {
      console.log("❌ Cancelled. Nothing was deleted.");
    }

    await mongoose.disconnect();
    readline.close();
    process.exit(0);
  });
}

nuclearClean();
