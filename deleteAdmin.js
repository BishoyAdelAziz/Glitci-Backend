const mongoose = require("mongoose");
const User = require("./src/models/User"); // adjust path if needed
require("dotenv").config();

async function deleteAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const result = await User.deleteOne({ email: "bishoy.adel5555@gmail.com" }); // replace email
    if (result.deletedCount === 1) {
      console.log("Admin user deleted successfully");
    } else {
      console.log("Admin user not found");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error deleting admin user:", err);
  }
}

deleteAdmin();
