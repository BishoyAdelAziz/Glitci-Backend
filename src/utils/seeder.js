const mongoose = require("mongoose");
const Service = require("../models/Service");
require("dotenv").config();

const defaultServices = [
  // Software Services
  {
    name: "Website Development",
    category: "software",
    description: "Custom website development using modern technologies",
    basePrice: 5000,
    estimatedHours: 200,
  },
  {
    name: "Mobile App Development",
    category: "software",
    description: "Native and cross-platform mobile application development",
    basePrice: 8000,
    estimatedHours: 300,
  },
  {
    name: "E-commerce Platform",
    category: "software",
    description: "Complete e-commerce solution with payment integration",
    basePrice: 10000,
    estimatedHours: 400,
  },
  {
    name: "CRM System",
    category: "software",
    description: "Custom Customer Relationship Management system",
    basePrice: 12000,
    estimatedHours: 500,
  },
  {
    name: "API Development",
    category: "software",
    description: "RESTful API development and integration",
    basePrice: 3000,
    estimatedHours: 120,
  },

  // Marketing Services
  {
    name: "Media Buying",
    category: "marketing",
    description: "Strategic media buying and ad placement",
    basePrice: 2000,
    estimatedHours: 80,
  },
  {
    name: "Graphic Design",
    category: "marketing",
    description: "Professional graphic design services",
    basePrice: 1500,
    estimatedHours: 60,
  },
  {
    name: "Social Media Management",
    category: "marketing",
    description: "Complete social media strategy and management",
    basePrice: 2500,
    estimatedHours: 100,
  },
  {
    name: "SEO Optimization",
    category: "marketing",
    description: "Search Engine Optimization and content strategy",
    basePrice: 3000,
    estimatedHours: 120,
  },
  {
    name: "Brand Identity Design",
    category: "marketing",
    description: "Complete brand identity and logo design",
    basePrice: 4000,
    estimatedHours: 150,
  },
];

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing services
    await Service.deleteMany({});

    // Insert default services
    await Service.insertMany(defaultServices);

    console.log("Default services seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding services:", error);
    process.exit(1);
  }
};

seedServices();
