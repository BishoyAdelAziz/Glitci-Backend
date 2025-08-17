const mongoose = require("mongoose");

// Models (adjust paths as needed)
const Department = require("./src/models/Departments");
const Position = require("./src/models/Position");
const Skill = require("./src/models/Skill");
require("dotenv").config();
// MongoDB connection (replace with your `mongodb+srv` URI)
const MONGO_URI = process.env.MONGODB_URI;
async function migrateCollection(Model, refUpdates = []) {
  const docs = await Model.find({});

  for (const doc of docs) {
    const oldId = doc._id;
    const newId = oldId.toString();

    // Skip if already a string
    if (typeof oldId === "string") continue;

    console.log(`Updating ${Model.modelName} ID: ${oldId} → ${newId}`);

    // Temporarily disable _id to allow updates
    doc._id = mongoose.Types.ObjectId(); // Assign a temp ID
    await doc.save();

    // Reassign with new string ID
    doc._id = newId;
    await doc.save();

    // Update references in other collections
    for (const { model, field } of refUpdates) {
      await model.updateMany({ [field]: oldId }, { $set: { [field]: newId } });
    }
  }

  console.log(`✅ Migrated ${Model.modelName}`);
}

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🚀 Connected to MongoDB");

    // Migrate in dependency order
    await migrateCollection(Department, [
      { model: Position, field: "department" },
    ]);

    await migrateCollection(Position, [{ model: Skill, field: "position" }]);

    await migrateCollection(Skill);

    console.log("🎉 Migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
