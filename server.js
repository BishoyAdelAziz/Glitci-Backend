const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const errorHandler = require("./src/middleware/errorHandler");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();

// 🔴 CRITICAL: Trust proxy for Vercel (MUST be first)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for Swagger
  })
);

// CORS - allow your frontend
app.use(
  cors({
    origin: [
      "https://glitciapp.vercel.app",
      "https://glitciapp-*.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

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

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================
// MONGOOSE CONNECTION WITH VERCEL OPTIMIZATION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing from environment variables");
}

// Connection caching for serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔌 Connecting to MongoDB...");

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 5,
      minPoolSize: 0,
      // Add this line:
      serverless: true, // or `retryWrites: true` for older drivers
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, options)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Connect to database on first API call
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    res.status(503).json({
      success: false,
      error: "Database connection failed",
      message: err.message,
    });
  }
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

try {
  const swaggerDoc = YAML.load(path.join(__dirname, "openapi.yaml"));
  const CSS_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css";

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDoc, {
      customCssUrl: CSS_URL,
      customJs: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js",
      ],
    })
  );
  console.log("✅ Swagger docs available at /api-docs");
} catch (error) {
  console.warn("⚠️ Could not load Swagger docs:", error.message);
}

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Glitci Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api-docs",
      "/api/auth",
      "/api/services",
      "/api/clients",
      "/api/employees",
      "/api/projects",
      "/api/analytics",
      "/api/departments",
      "/api/positions",
      "/api/skills",
      "/api/finance",
    ],
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const db = mongoose.connection;
    const readyState = db.readyState;

    res.json({
      success: true,
      status: readyState === 1 ? "healthy" : "connecting",
      database: readyState === 1 ? "connected" : "disconnected",
      readyState: readyState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount all routes
app.use("/api/auth", authRoutes);
app.use("/api/services", require("./src/routes/serviceRoutes"));
app.use("/api/clients", require("./src/routes/clientRoutes"));
app.use("/api/employees", require("./src/routes/employeeRoutes"));
app.use("/api/projects", require("./src/routes/projectRoutes"));
app.use("/api/analytics", require("./src/routes/analyticsRoutes"));
app.use("/api/departments", require("./src/routes/departmentRoutes"));
app.use("/api/positions", require("./src/routes/positionRoutes"));
app.use("/api/skills", require("./src/routes/skillRoutes"));
app.use("/api/finance", require("./src/routes/financeRoutes"));

// ============================================
// DEBUG ENDPOINTS
// ============================================

// Test MongoDB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    res.json({
      success: true,
      message: "Database connected",
      collections: collections.map((c) => ({
        name: c.name,
        type: c.type,
      })),
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

// Test specific collection
app.get("/api/test-employees", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const employees = await db
      .collection("employees")
      .find({})
      .limit(5)
      .toArray();

    res.json({
      success: true,
      count: employees.length,
      data: employees,
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
// ERROR HANDLING
// ============================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/",
      "/health",
      "/api-docs",
      "/api/test-db",
      "/api/test-employees",
      "/api/auth/*",
      "/api/services/*",
      "/api/clients/*",
      "/api/employees/*",
      "/api/projects/*",
      "/api/analytics/*",
      "/api/departments/*",
      "/api/positions/*",
      "/api/skills/*",
      "/api/finance/*",
    ],
  });
});

// ============================================
// SERVER START (for local development only)
// ============================================

// Only start the server if we're not in a serverless environment
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.log("UNHANDLED REJECTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    process.exit(1);
  });
}

// Export the app for Vercel
module.exports = app;
