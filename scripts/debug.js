#!/usr/bin/env node
const mongoose = require("mongoose");
require("dotenv").config();

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Skill = require("../src/models/Skill");
  const Position = require("../src/models/Position");

  const positionId = "695557408baac1cf16dbbe06";
  const skillIds = [
    "69555e7284ff53562f06606f",
    "6955580a8baac1cf16dbbe15",
    "695558018baac1cf16dbbe13",
    "695558128baac1cf16dbbe17",
  ];

  console.log("🔍 Checking skill-position relationships...\n");

  // Check the position
  const position = await Position.findById(positionId);
  console.log(`Position: ${position?.name} (${positionId})`);
  console.log(
    `Position skills array:`,
    position?.skills?.map((s) => s.toString()) || []
  );

  // Check each skill
  console.log("\n📋 Checking skills:");
  for (const skillId of skillIds) {
    const skill = await Skill.findById(skillId).populate("position", "name");

    if (!skill) {
      console.log(`❌ Skill ${skillId}: NOT FOUND in database`);
      continue;
    }

    console.log(`\n${skill.name} (${skillId}):`);
    console.log(
      `  Position: ${skill.position?.name || "None"} (${
        skill.position?._id || "No ID"
      })`
    );

    const belongs = skill.position?._id?.toString() === positionId;
    console.log(
      `  Belongs to position ${positionId}? ${belongs ? "✅ YES" : "❌ NO"}`
    );

    if (!skill.position) {
      console.log(`  ⚠️  Skill has no position assigned`);
    }
  }

  // Check which skills are actually linked to this position
  console.log("\n🔗 Skills actually belonging to this position:");
  const positionSkills = await Skill.find({ position: positionId });
  console.log(
    positionSkills.map((s) => `${s.name} (${s._id})`).join(", ") || "None"
  );

  await mongoose.disconnect();
}

debug().catch(console.error);
