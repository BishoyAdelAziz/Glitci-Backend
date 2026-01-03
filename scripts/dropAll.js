#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

async function dropAll() {
  try {
    console.log("🚀 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Drop collections directly
    const db = mongoose.connection.db;

    const collections = ["departments", "positions", "skills"];

    for (const collection of collections) {
      try {
        await db.collection(collection).drop();
        console.log(`🗑️  Dropped collection: ${collection}`);
      } catch (err) {
        console.log(
          `ℹ️  Collection ${collection} doesn't exist or already dropped`
        );
      }
    }

    // Also clear references from employees
    try {
      await db
        .collection("employees")
        .updateMany(
          {},
          { $set: { department: null, position: null, skills: [] } }
        );
      console.log(
        "✅ Cleared department/position/skill references from employees"
      );
    } catch (err) {
      console.log("ℹ️  No employees collection or already cleared");
    }

    console.log("\n🎯 Database cleaned successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Connection closed");
    process.exit(0);
  }
}

dropAll();
