// src/utils/demoSeeder.js
const mongoose = require("mongoose");
const Client = require("./src/models/Client");
const Employee = require("./src/models/Employee");
const Project = require("./src/models/Project");
const Service = require("./src/models/Service");
const Departments = require("./src/models/Departments");
require("dotenv").config();

async function seedDemoData() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/glitci_demo"
  );

  // Clear existing demo data
  let dept = await Departments.findOne({ name: "Marketing" });
  if (!dept) {
    dept = await Departments.create({ name: "Marketing" });
  }

  // Create Client
  const client = await Client.create({
    name: "Dina elTaweel",
    email: "Dina@example.com",
    phone: "015151546564",
    companyName: "Ayadi",
  });

  // Create Employees
  const employees = await Employee.insertMany([
    {
      name: "Marwan Magy",
      email: "Marwan.Magdy@example.com",
      position: "Designer",
      department: "Marketing",
      role: "employee",
    },
    {
      name: "Bishoy Adel",
      email: "bishoy.adel5555@gmail.com",
      position: "web Developer",
      role: "employee",
    },
    {
      name: "Mahmoud elsayed",
      email: "mahoud.elsayed@example.com",
      position: "Tester",
      role: "employee",
    },
  ]);

  // Create Service
  const service = await Service.create({
    name: "Web Development",
    description: "Full stack web development",
    price: 15000,
  });

  // Create Project
  const project = await Project.create({
    projectName: "Ayadi",
    employees: employees.map((e) => ({ employee: e._id, role: e.position })),
    budget: 15000,
    deposit: 5000,
    client: client._id,
    services: [service._id],
    status: "in_progress",
    startDate: new Date(),
    endDate: null,
    deliverables: ["Website", "Documentation"],
    notes: "Demo project for Ayadi",
  });

  console.log("Demo data seeded successfully!");
  mongoose.disconnect();
}

seedDemoData().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
