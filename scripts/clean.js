#!/usr/bin/env node
const mongoose = require("mongoose");
require("dotenv").config();

async function syncData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Position = require("../models/Position");
  const Skill = require("../models/Skill");

  console.log("🔗 Syncing skills and positions...");

  // Clear all position skills arrays first
  await Position.updateMany({}, { $set: { skills: [] } });
  console.log("✅ Cleared all position skills arrays");

  // Get all skills
  const skills = await Skill.find().lean();
  console.log(`Found ${skills.length} skills`);

  // Group skills by position
  const skillsByPosition = {};
  skills.forEach((skill) => {
    if (skill.position) {
      const positionId = skill.position.toString();
      if (!skillsByPosition[positionId]) {
        skillsByPosition[positionId] = [];
      }
      skillsByPosition[positionId].push(skill._id);
    }
  });

  console.log(
    `Skills grouped into ${Object.keys(skillsByPosition).length} positions`
  );

  // Update each position with its skills
  for (const [positionId, skillIds] of Object.entries(skillsByPosition)) {
    await Position.findByIdAndUpdate(positionId, {
      $set: { skills: skillIds },
    });
    const position = await Position.findById(positionId);
    console.log(
      `✅ ${position?.name || positionId}: Added ${skillIds.length} skills`
    );
  }

  // Verify
  const positions = await Position.find().populate("skills", "name").lean();
  console.log("\n📊 Final state:");
  positions.forEach((pos) => {
    console.log(
      `${pos.name}: ${pos.skills.length} skills (${
        pos.skills.map((s) => s.name).join(", ") || "none"
      })`
    );
  });

  await mongoose.disconnect();
  console.log("\n🎯 Sync completed!");
}

syncData().catch(console.error);
