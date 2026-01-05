// api/index.js - FIXED VERSION
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");

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
    console.error("Database connection error:", error.message);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 🔴 FIXED: Simplified route loading without problematic placeholder
// Load routes with error handling
const loadRoute = (routePath, routeName) => {
  try {
    // Try to load the route file
    const route = require(routePath);
    console.log(`✓ Loaded ${routeName} routes from ${routePath}`);
    return route;
  } catch (error) {
    console.warn(
      `⚠️ ${routeName} routes not found at ${routePath}:`,
      error.message
    );
    // Return a simple placeholder that doesn't break
    return express.Router();
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

// Try to load analytics if it exists
try {
  app.use("/api/analytics", require("../src/routes/analyticsRoutes"));
  console.log("✓ Loaded analytics routes");
} catch (e) {
  console.log("ℹ️ Analytics routes not found, skipping...");
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

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

// Export the app
module.exports = app;
