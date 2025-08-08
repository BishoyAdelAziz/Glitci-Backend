require("dotenv").config();
const mongoose = require("mongoose");
const Department = require("./src/models/Departments");
const Position = require("./src/models/Position");
const Skill = require("./src/models/Skill");
const Employee = require("./src/models/Employee");
const Counter = require("./src/models/counter");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};
// Initialize counters
const initCounters = async () => {
  await Counter.deleteMany({});
  await Counter.create([
    { _id: "departmentId", seq: 1 },
    { _id: "positionId", seq: 1 },
    { _id: "skillId", seq: 1 },
    { _id: "employeeId", seq: 1 },
  ]);
  console.log("Initialized counters");
};

// Clear existing data
const clearData = async () => {
  await Department.deleteMany({});
  await Position.deleteMany({});
  await Skill.deleteMany({});
  await Employee.deleteMany({});
  console.log("Cleared existing database");
};

// Create departments
const createDepartments = async () => {
  const departments = [
    { name: "Marketing", description: "Handles all marketing activities" },
    { name: "Development", description: "Handles all software development" },
  ];

  const createdDepts = await Department.insertMany(departments);
  console.log(
    "Created departments:",
    createdDepts.map((d) => `${d.name} (ID: ${d._id})`)
  );
  return createdDepts;
};

// Create skills
const createSkills = async () => {
  const skills = [
    // Marketing skills
    { name: "SEO", department: "marketing" },
    { name: "Social Media", department: "marketing" },
    { name: "Content Writing", department: "marketing" },

    // Development skills
    { name: "JavaScript", department: "development" },
    { name: "React", department: "development" },
    { name: "Node.js", department: "development" },
  ];

  const createdSkills = await Skill.insertMany(skills);
  console.log("Created skills:", createdSkills.length);
  return createdSkills;
};

// Create positions
const createPositions = async (departments, skills) => {
  const marketingDept = departments.find((d) => d.name === "Marketing");
  const devDept = departments.find((d) => d.name === "Development");

  const seoSkill = skills.find((s) => s.name === "SEO");
  const jsSkill = skills.find((s) => s.name === "JavaScript");

  const positions = [
    // Marketing positions
    {
      name: "Marketing Specialist",
      department: marketingDept._id,
      description: "Handles marketing campaigns",
      requiredSkills: [seoSkill._id],
    },

    // Development positions
    {
      name: "Frontend Developer",
      department: devDept._id,
      description: "Develops user interfaces",
      requiredSkills: [jsSkill._id],
    },
  ];

  const createdPositions = await Position.insertMany(positions);
  console.log(
    "Created positions:",
    createdPositions.map((p) => `${p.name} (ID: ${p._id})`)
  );
  return createdPositions;
};

// Create sample employees
const createEmployees = async (departments, positions, skills) => {
  const marketingPosition = positions.find(
    (p) => p.name === "Marketing Specialist"
  );
  const devPosition = positions.find((p) => p.name === "Frontend Developer");

  const seoSkill = skills.find((s) => s.name === "SEO");
  const jsSkill = skills.find((s) => s.name === "JavaScript");

  const employees = [
    // Marketing employee
    {
      name: "Marketing Person",
      email: "marketing@example.com",
      phones: ["1234567890"],
      departments: [departments.find((d) => d.name === "Marketing")._id],
      positions: [{ position: marketingPosition._id, isPrimary: true }],
      skills: [{ skill: seoSkill._id, proficiencyLevel: "advanced" }],
      availability: "available",
      employeeType: "full_time",
    },

    // Development employee
    {
      name: "Developer Person",
      email: "developer@example.com",
      phones: ["9876543210"],
      departments: [departments.find((d) => d.name === "Development")._id],
      positions: [{ position: devPosition._id, isPrimary: true }],
      skills: [{ skill: jsSkill._id, proficiencyLevel: "expert" }],
      availability: "available",
      employeeType: "full_time",
    },
  ];

  const createdEmployees = await Employee.insertMany(employees);
  console.log("Created employees:", createdEmployees.length);
  return createdEmployees;
};

// Main initialization function
const initializeData = async () => {
  try {
    await connectDB();
    await clearData();
    await initCounters();

    const departments = await createDepartments();
    const skills = await createSkills();
    const positions = await createPositions(departments, skills);
    await createEmployees(departments, positions, skills);

    console.log("Database initialization complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error initializing data:", err);
    process.exit(1);
  }
};

// Run the initialization
initializeData();
