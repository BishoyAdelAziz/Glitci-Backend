// resetInitializeData.js
require("dotenv").config();
const mongoose = require("mongoose");
const Department = require("./src/models/Departments");
const Role = require("./src/models/Position");
const Skill = require("./src/models/Skill");
const Counter = require("./src/models/counter");

// Read Mongo URI from env or fallback
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/glitci";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// Departments and corresponding roles with skills
const departmentsData = [{ name: "marketing" }, { name: "development" }];

const rolesData = {
  marketing: [
    {
      name: "social media",
      skills: ["content strategy", "community management"],
    },
    { name: "graphic design", skills: ["adobe creative suite", "typography"] },
    { name: "content creator", skills: ["copywriting", "seo"] },
    { name: "video editor", skills: ["premiere pro", "after effects"] },
  ],
  development: [
    { name: "frontend", skills: ["html/css", "javascript"] },
    { name: "backend", skills: ["node.js", "python"] },
    {
      name: "wordpress developer",
      skills: ["wordpress", "php", "plugin development", "theme customization"],
    },
    { name: "automation", skills: ["selenium", "cypress"] },
  ],
};

async function initializeCounters() {
  // Reset the counters to zero
  await Counter.deleteMany({});
  await Counter.create([
    { _id: "departmentId", seq: 0 },
    { _id: "roleId", seq: 0 },
    { _id: "skillId", seq: 0 },
  ]);
  console.log("Initialized counters");
}

async function initializeData() {
  try {
    await connectDB();

    // Drop entire database for a clean slate
    await mongoose.connection.db.dropDatabase();
    console.log("Cleared existing database");

    // Re-initialize counters after clearing database
    await initializeCounters();

    // Create Departments
    const departments = {};
    for (const dept of departmentsData) {
      const department = await Department.create({
        name: dept.name.toLowerCase(),
      });
      departments[dept.name] = department;
      console.log(
        `Created department: ${department.name} (ID: ${department._id})`
      );
    }

    // Create Roles and Skills for each department
    for (const [deptName, roles] of Object.entries(rolesData)) {
      const department = departments[deptName];
      if (!department) {
        console.warn(
          `Department ${deptName} not found, skipping roles creation`
        );
        continue;
      }

      for (const roleData of roles) {
        // Create Role with lowercase name and empty requiredSkills initially
        const role = await Role.create({
          name: roleData.name.toLowerCase(),
          department: department._id,
          requiredSkills: [],
          level: "mid",
          isActive: true,
        });
        console.log(
          `Created role: ${role.name} in ${department.name} department (ID: ${role._id})`
        );

        // Create or reuse Skills by name
        const skillIds = [];
        for (const skillName of roleData.skills) {
          const skillNameLC = skillName.toLowerCase();
          let skill = await Skill.findOne({ name: skillNameLC });
          if (!skill) {
            skill = await Skill.create({
              name: skillNameLC,
              isActive: true,
            });
            console.log(`  Created skill: ${skill.name} (ID: ${skill._id})`);
          } else {
            console.log(
              `  Found existing skill: ${skill.name} (ID: ${skill._id})`
            );
          }
          skillIds.push(skill._id);
        }

        // Assign skills to role's requiredSkills with default proficiencyLevel and required=true
        role.requiredSkills = skillIds.map((skillId) => ({
          skill: skillId,
          proficiencyLevel: "intermediate",
          isRequired: true,
        }));

        await role.save();
        console.log(`Assigned ${skillIds.length} skills to role ${role.name}`);
      }
    }

    console.log("Data initialization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing data:", error);
    process.exit(1);
  }
}

// Run the initializer
initializeData();
