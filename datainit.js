const mongoose = require("mongoose");
const Department = require("./src/models/Departments");
const Position = require("./src/models/Position");
const Skill = require("./src/models/Skill");
const Counter = require("./src/models/counter");
require("dotenv").config();

async function initializeData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB...");

    // Reset counters to ensure clean IDs
    await Counter.deleteMany({});
    await Counter.create([
      { _id: "departmentId", seq: 0 },
      { _id: "PositionId", seq: 0 },
      { _id: "skillId", seq: 0 },
    ]);

    // Clear existing data
    await Department.deleteMany({});
    await Position.deleteMany({});
    await Skill.deleteMany({});

    console.log("Cleared existing data...");

    // 1. Create Departments
    const marketingDept = await Department.create({
      name: "Marketing",
    });

    const softwareDept = await Department.create({
      name: "Software",
    });

    console.log("Created departments...");

    // 2. Create Positions for Marketing Department
    const marketingPositions = [
      { name: "Social Media Manager" },
      { name: "Content Creator" },
      { name: "Graphic Designer" },
      { name: "Video Editor" },
    ];

    const createdMarketingPositions = await Promise.all(
      marketingPositions.map((pos) =>
        Position.create({
          name: pos.name,
          department: marketingDept._id,
        })
      )
    );

    // 3. Create Positions for Software Department
    const softwarePositions = [
      { name: "Frontend Developer" },
      { name: "Backend Developer" },
      { name: "WordPress Developer" },
      { name: "PHP Developer" },
      { name: ".NET Developer" },
      { name: "DevOps Engineer" },
    ];

    const createdSoftwarePositions = await Promise.all(
      softwarePositions.map((pos) =>
        Position.create({
          name: pos.name,
          department: softwareDept._id,
        })
      )
    );

    console.log("Created positions...");

    // 4. Define all skills with their associated positions
    const skillDefinitions = [
      // Marketing skills
      { name: "Social Media Strategy", positions: ["Social Media Manager"] },
      { name: "Content Planning", positions: ["Social Media Manager"] },
      { name: "Analytics", positions: ["Social Media Manager"] },
      { name: "Community Management", positions: ["Social Media Manager"] },
      { name: "Copywriting", positions: ["Content Creator"] },
      { name: "SEO Writing", positions: ["Content Creator"] },
      { name: "Research", positions: ["Content Creator"] },
      { name: "Editing", positions: ["Content Creator"] },
      { name: "Adobe Photoshop", positions: ["Graphic Designer"] },
      { name: "Illustrator", positions: ["Graphic Designer"] },
      { name: "Typography", positions: ["Graphic Designer"] },
      { name: "Branding", positions: ["Graphic Designer"] },
      { name: "Premiere Pro", positions: ["Video Editor"] },
      { name: "After Effects", positions: ["Video Editor"] },
      { name: "Color Grading", positions: ["Video Editor"] },
      { name: "Motion Graphics", positions: ["Video Editor"] },

      // Software skills (shared between positions)
      { name: "HTML/CSS", positions: ["Frontend Developer"] },
      {
        name: "JavaScript",
        positions: ["Frontend Developer", "Backend Developer"],
      },
      { name: "React", positions: ["Frontend Developer"] },
      { name: "Responsive Design", positions: ["Frontend Developer"] },
      { name: "Node.js", positions: ["Backend Developer"] },
      { name: "Database Design", positions: ["Backend Developer"] },
      { name: "API Development", positions: ["Backend Developer"] },
      { name: "System Architecture", positions: ["Backend Developer"] },
      {
        name: "PHP",
        positions: [
          "Backend Developer",
          "WordPress Developer",
          "PHP Developer",
        ],
      },
      { name: "WordPress CMS", positions: ["WordPress Developer"] },
      { name: "Theme Development", positions: ["WordPress Developer"] },
      { name: "Plugin Development", positions: ["WordPress Developer"] },
      { name: "Laravel", positions: ["PHP Developer"] },
      { name: "MySQL", positions: ["PHP Developer"] },
      { name: "RESTful APIs", positions: ["PHP Developer"] },
      { name: "C#", positions: [".NET Developer"] },
      { name: "ASP.NET", positions: [".NET Developer"] },
      { name: "SQL Server", positions: [".NET Developer"] },
      { name: "MVC Architecture", positions: [".NET Developer"] },
      { name: "Docker", positions: ["DevOps Engineer"] },
      { name: "Kubernetes", positions: ["DevOps Engineer"] },
      { name: "CI/CD Pipelines", positions: ["DevOps Engineer"] },
      { name: "Cloud Infrastructure", positions: ["DevOps Engineer"] },
    ];

    // Combine all positions for easy lookup
    const allPositions = [
      ...createdMarketingPositions,
      ...createdSoftwarePositions,
    ];
    const positionMap = {};
    allPositions.forEach((pos) => {
      positionMap[pos.name] = pos._id;
    });

    // Create skills and associate them with positions
    const createdSkills = [];
    for (const skillDef of skillDefinitions) {
      // For each position this skill belongs to
      for (const positionName of skillDef.positions) {
        const positionId = positionMap[positionName];
        if (!positionId) {
          console.warn(`Position not found: ${positionName}`);
          continue;
        }

        // Create the skill for this specific position
        const skill = await Skill.create({
          name: skillDef.name,
          position: positionId,
        });
        createdSkills.push(skill);

        // Add the skill to the position's skills array
        await Position.findByIdAndUpdate(positionId, {
          $addToSet: { skills: skill._id },
        });
      }
    }

    console.log("Created and associated skills...");
    console.log("Initialization completed successfully!");

    // Display summary
    console.log("\n=== Initialization Summary ===");
    console.log(`Departments Created: 2 (Marketing, Software)`);
    console.log(`Marketing Positions: ${createdMarketingPositions.length}`);
    console.log(`Software Positions: ${createdSoftwarePositions.length}`);
    console.log(`Total Skill-Position Associations: ${createdSkills.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }
}

initializeData();
