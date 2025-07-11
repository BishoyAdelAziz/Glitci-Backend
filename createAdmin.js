const mongoose = require("mongoose");
const User = require("./src/models/User"); // Adjust path if needed
require("dotenv").config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const adminEmail = process.env.FIRST_ADMIN_EMAIL;
    const adminPassword = process.env.FIRST_ADMIN_PASSWORD;
    const adminName = process.env.FIRST_ADMIN_NAME || "Admin";

    if (!adminEmail || !adminPassword) {
      console.error(
        "Please set FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD in your .env"
      );
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      role: "admin",
    });

    await adminUser.save();
    console.log("Admin user created successfully");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error creating admin user:", err);
    process.exit(1);
  }
}

createAdmin();
