// api/index.js - UPDATED FOR YOUR STRUCTURE
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();

// 🔴 CRITICAL FIX: Trust proxy for Vercel
app.set("trust proxy", 1);

// Security + parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting - FIXED for Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For header in Vercel
    return req.headers["x-forwarded-for"] || req.ip;
  },
});

// Apply rate limiting to API routes
app.use("/api/", limiter);

// Cache mongoose connection
let cached = global.mongoose;
async function connectDB() {
  if (cached && cached.conn) return cached.conn;
  if (!cached) cached = global.mongoose = { conn: null, promise: null };
  if (!cached.promise) {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, options)
      .then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Root endpoint for Vercel health checks
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Glitci Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/health",
      "/api/auth",
      "/api/clients",
      "/api/employees",
      "/api/projects",
      "/api/departments",
      "/api/positions",
      "/api/skills",
      "/api/services",
      "/api/finance",
    ],
  });
});

// Health check endpoint
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

// 🔴 FIXED: Correct route imports from src/routes
// Load routes with error handling
const loadRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    return route;
  } catch (error) {
    console.warn(`Warning: ${routeName} route not found at ${routePath}`);
    // Return a placeholder router
    const router = express.Router();
    router.all("*", (req, res) => {
      res.status(501).json({
        success: false,
        message: `${routeName} routes not implemented yet`,
        path: req.path,
      });
    });
    return router;
  }
};

// Load routes from src/routes
app.use("/api/auth", loadRoute("../src/routes/auth", "auth"));
app.use("/api/clients", loadRoute("../src/routes/clientRoutes", "clients"));
app.use(
  "/api/employees",
  loadRoute("../src/routes/employeeRoutes", "employees")
);
app.use("/api/projects", loadRoute("../src/routes/projectRoutes", "projects"));
app.use(
  "/api/departments",
  loadRoute("../src/routes/departmentRoutes", "departments")
);
app.use(
  "/api/positions",
  loadRoute("../src/routes/positionRoutes", "positions")
);
app.use("/api/skills", loadRoute("../src/routes/skillRoutes", "skills"));
app.use("/api/services", loadRoute("../src/routes/serviceRoutes", "services"));
app.use("/api/finance", loadRoute("../src/routes/financeRoutes", "finance"));

// Optional analytics route
try {
  app.use("/api/analytics", require("../src/routes/analyticsRoutes"));
} catch (e) {
  console.log("Analytics routes not found, skipping...");
}

// Error handler
const errorHandler = require("../src/middleware/errorHandler");
app.use(errorHandler);

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "/",
      "/health",
      "/api/auth/*",
      "/api/clients/*",
      "/api/employees/*",
      "/api/projects/*",
      "/api/departments/*",
      "/api/positions/*",
      "/api/skills/*",
      "/api/services/*",
      "/api/finance/*",
    ],
  });
});

module.exports = app;
