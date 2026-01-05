// api/index.js - ULTRA SIMPLE WORKING VERSION
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();

// Trust proxy for Vercel
app.set("trust proxy", 1);

// Security + parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: [
      "https://glitciapp.vercel.app",
      "https://glitciapp-*.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers["x-forwarded-for"] || req.ip;
  },
});

app.use("/api/", limiter);

// ============================================
// SIMPLE MONGOOSE CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log("✅ MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

// ============================================
// BASIC ENDPOINTS
// ============================================

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Glitci Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/health",
      "/api/test",
      "/api/departments",
      "/api/employees",
      "/api/positions",
      "/api/skills",
      "/api/services",
      "/api/projects",
      "/api/clients",
    ],
  });
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await connectDB();
    res.json({
      success: true,
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// SIMPLE DIRECT ENDPOINTS
// ============================================

console.log("🚀 Setting up simple endpoints...");

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
  });
});

// Departments - Direct MongoDB access
app.get("/api/departments", async (req, res) => {
  try {
    const db = await connectDB();

    // Direct MongoDB collection access (no model needed)
    const departments = await db
      .collection("departments")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: departments.length,
      data: departments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Departments error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Employees - Direct MongoDB access
app.get("/api/employees", async (req, res) => {
  try {
    const db = await connectDB();

    // Get employees with department names
    const employees = await db
      .collection("employees")
      .aggregate([
        { $match: { isActive: true } },
        { $sort: { name: 1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "departmentInfo",
          },
        },
        {
          $lookup: {
            from: "positions",
            localField: "position",
            foreignField: "_id",
            as: "positionInfo",
          },
        },
        {
          $addFields: {
            department: { $arrayElemAt: ["$departmentInfo", 0] },
            position: { $arrayElemAt: ["$positionInfo", 0] },
          },
        },
        {
          $project: {
            departmentInfo: 0,
            positionInfo: 0,
          },
        },
      ])
      .toArray();

    res.json({
      success: true,
      count: employees.length,
      data: employees,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Employees error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Positions
app.get("/api/positions", async (req, res) => {
  try {
    const db = await connectDB();

    const positions = await db
      .collection("positions")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: positions.length,
      data: positions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Positions error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Skills
app.get("/api/skills", async (req, res) => {
  try {
    const db = await connectDB();

    const skills = await db
      .collection("skills")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: skills.length,
      data: skills,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Skills error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Services
app.get("/api/services", async (req, res) => {
  try {
    const db = await connectDB();

    const services = await db
      .collection("services")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: services.length,
      data: services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Services error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Projects
app.get("/api/projects", async (req, res) => {
  try {
    const db = await connectDB();

    const projects = await db
      .collection("projects")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: projects.length,
      data: projects,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Projects error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Clients
app.get("/api/clients", async (req, res) => {
  try {
    const db = await connectDB();

    const clients = await db
      .collection("clients")
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: clients.length,
      data: clients,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Clients error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Finance
app.get("/api/finance", async (req, res) => {
  try {
    const db = await connectDB();

    const finance = await db
      .collection("financialrecords")
      .find({})
      .sort({ date: -1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      count: finance.length,
      data: finance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Finance error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// GET BY ID ENDPOINTS
// ============================================

// Get department by ID
app.get("/api/departments/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const ObjectId = mongoose.Types.ObjectId;

    const department = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(req.params.id), isActive: true });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: "Department not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: department,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Department by ID error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get employee by ID
app.get("/api/employees/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const ObjectId = mongoose.Types.ObjectId;

    const employee = await db
      .collection("employees")
      .aggregate([
        { $match: { _id: new ObjectId(req.params.id), isActive: true } },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "departmentInfo",
          },
        },
        {
          $lookup: {
            from: "positions",
            localField: "position",
            foreignField: "_id",
            as: "positionInfo",
          },
        },
        {
          $lookup: {
            from: "skills",
            localField: "skills",
            foreignField: "_id",
            as: "skillInfo",
          },
        },
        {
          $addFields: {
            department: { $arrayElemAt: ["$departmentInfo", 0] },
            position: { $arrayElemAt: ["$positionInfo", 0] },
            skills: "$skillInfo",
          },
        },
        {
          $project: {
            departmentInfo: 0,
            positionInfo: 0,
            skillInfo: 0,
          },
        },
      ])
      .toArray();

    if (!employee || employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: employee[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Employee by ID error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// AUTH ENDPOINTS (SIMPLIFIED)
// ============================================

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const db = await connectDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        timestamp: new Date().toISOString(),
      });
    }

    // Simplified password check
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get current user
app.get("/api/auth/me", async (req, res) => {
  try {
    const db = await connectDB();

    // Simplified - you should implement proper auth
    const user = await db.collection("users").findOne({});

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// DEBUG ENDPOINTS
// ============================================

// List all collections
app.get("/api/debug/collections", async (req, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();

    const collectionInfo = [];

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      collectionInfo.push({
        name: coll.name,
        count: count,
      });
    }

    res.json({
      success: true,
      collections: collectionInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test database
app.get("/api/debug/test-db", async (req, res) => {
  try {
    const db = await connectDB();

    // Test multiple collections
    const [departments, employees, positions, skills] = await Promise.all([
      db.collection("departments").countDocuments(),
      db.collection("employees").countDocuments(),
      db.collection("positions").countDocuments(),
      db.collection("skills").countDocuments(),
    ]);

    res.json({
      success: true,
      database: "connected",
      counts: {
        departments,
        employees,
        positions,
        skills,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "/",
      "/health",
      "/api/test",
      "/api/debug/collections",
      "/api/debug/test-db",
      "/api/auth/login",
      "/api/auth/me",
      "/api/departments",
      "/api/departments/:id",
      "/api/employees",
      "/api/employees/:id",
      "/api/positions",
      "/api/skills",
      "/api/services",
      "/api/projects",
      "/api/clients",
      "/api/finance",
    ],
  });
});

// ============================================
// EXPORT
// ============================================

module.exports = app;
