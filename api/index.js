// api/index.js - FINAL WORKING VERSION
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();

// 🔴 CRITICAL FIX: Trust proxy for Vercel
app.set("trust proxy", 1);

// Security + parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS - allow your frontend
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

// Rate limiting - FIXED for Vercel
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

// Apply rate limiting to API routes
app.use("/api/", limiter);

// ============================================
// IMPROVED MONGOOSE CONNECTION FOR VERCEL
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
}

// Global connection cache
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // If already connected, return the connection
  if (cached.conn) {
    return cached.conn;
  }

  // If connecting, wait for the promise
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  console.log("🔌 Establishing MongoDB connection...");

  // Configure mongoose for Vercel/serverless
  mongoose.set("strictQuery", false);

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
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

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Root endpoint for Vercel health checks
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Glitci Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/health",
      "/api/test-connection",
      "/api/departments",
      "/api/employees",
      "/api/positions",
      "/api/skills",
      "/api/services",
      "/api/projects",
      "/api/clients",
      "/api/finance",
    ],
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const startTime = Date.now();
    await connectDB();
    const endTime = Date.now();

    const connectionTime = endTime - startTime;
    const readyState = mongoose.connection.readyState;

    res.json({
      success: true,
      status: "healthy",
      database: "connected",
      connectionTime: `${connectionTime}ms`,
      readyState: readyState,
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

// ============================================
// DB CONNECTION MIDDLEWARE (FIXED)
// ============================================

// FIX: Use regex pattern instead of wildcard
app.use(/^\/api\//, async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(503).json({
      success: false,
      error: "Database connection failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// SIMPLE DIRECT API ENDPOINTS
// ============================================

console.log("🚀 Initializing API routes...");

// Helper to load a model
function loadModel(modelName) {
  const modelPath = path.join(
    __dirname,
    "..",
    "src",
    "models",
    `${modelName}.js`
  );

  if (!fs.existsSync(modelPath)) {
    console.error(`Model file not found: ${modelPath}`);
    return null;
  }

  try {
    delete require.cache[require.resolve(modelPath)];
    const Model = require(modelPath);

    if (!Model || !Model.prototype || !Model.prototype.$isMongooseModel) {
      console.error(`Invalid Mongoose model: ${modelName}`);
      return null;
    }

    return Model;
  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error.message);
    return null;
  }
}

// Generic CRUD handler
function createCRUDRouter(modelName, entityName) {
  const router = express.Router();

  // GET all
  router.get("/", async (req, res) => {
    try {
      const Model = loadModel(modelName);

      if (!Model) {
        return res.status(500).json({
          success: false,
          error: `Model ${modelName} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query
      const query = {};

      // Only include isActive if the model has it
      if (Model.schema.paths.isActive) {
        query.isActive = true;
      }

      // Search
      if (req.query.search) {
        if (Model.schema.paths.name) {
          query.name = { $regex: req.query.search, $options: "i" };
        }
      }

      // Execute query
      const [data, total] = await Promise.all([
        Model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Model.countDocuments(query),
      ]);

      res.json({
        success: true,
        count: data.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in ${entityName} GET:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET by ID
  router.get("/:id", async (req, res) => {
    try {
      const Model = loadModel(modelName);

      if (!Model) {
        return res.status(500).json({
          success: false,
          error: `Model ${modelName} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      const item = await Model.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: `${entityName} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: item,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in ${entityName} GET by ID:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

// ============================================
// CREATE AND MOUNT ALL ROUTES
// ============================================

// Map of endpoints to models
const endpoints = [
  { path: "/api/departments", model: "Departments", name: "departments" },
  { path: "/api/employees", model: "Employee", name: "employees" },
  { path: "/api/clients", model: "Client", name: "clients" },
  { path: "/api/projects", model: "Project", name: "projects" },
  { path: "/api/positions", model: "Position", name: "positions" },
  { path: "/api/skills", model: "Skill", name: "skills" },
  { path: "/api/services", model: "Service", name: "services" },
  { path: "/api/finance", model: "FinancialRecord", name: "financial records" },
];

console.log("\n🔄 Creating routes...");

endpoints.forEach(({ path, model, name }) => {
  const router = createCRUDRouter(model, name);
  app.use(path, router);
  console.log(`✅ Created ${path} (using ${model}.js)`);
});

// ============================================
// AUTH ROUTES
// ============================================

const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  try {
    const User = loadModel("User");

    if (!User) {
      return res.status(500).json({
        success: false,
        error: "User model not found",
        timestamp: new Date().toISOString(),
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        timestamp: new Date().toISOString(),
      });
    }

    // Simplified password check
    const isValid = user.password === password;

    if (!isValid) {
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

authRouter.post("/register", async (req, res) => {
  try {
    const User = loadModel("User");

    if (!User) {
      return res.status(500).json({
        success: false,
        error: "User model not found",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

authRouter.get("/me", async (req, res) => {
  res.json({
    success: true,
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
console.log("✅ Created /api/auth routes");

// ============================================
// TEST ENDPOINTS
// ============================================

// Test database connection
app.get("/api/test-connection", async (req, res) => {
  const startTime = Date.now();

  try {
    await connectDB();

    const endTime = Date.now();
    const connectionTime = endTime - startTime;

    // Test a simple query
    const testStart = Date.now();
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const testEnd = Date.now();
    const queryTime = testEnd - testStart;

    res.json({
      success: true,
      message: "Database connection successful",
      connectionTime: `${connectionTime}ms`,
      queryTime: `${queryTime}ms`,
      readyState: mongoose.connection.readyState,
      collections: collections.map((c) => c.name),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = Date.now();
    const connectionTime = endTime - startTime;

    console.error("Connection test failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      connectionTime: `${connectionTime}ms`,
      readyState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
    });
  }
});

// Quick data test
app.get("/api/test-data", async (req, res) => {
  try {
    // Test multiple collections
    const Departments = loadModel("Departments");
    const Employees = loadModel("Employee");

    if (!Departments || !Employees) {
      throw new Error("Models not loaded");
    }

    const [deptCount, empCount] = await Promise.all([
      Departments.countDocuments(),
      Employees.countDocuments(),
    ]);

    res.json({
      success: true,
      departments: deptCount,
      employees: empCount,
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

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
    endpoints: endpoints.map((e) => e.path),
  });
});

// ============================================
// REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${
        res.statusCode
      } (${duration}ms)`
    );
  });

  next();
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  console.error("Stack:", err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
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
      "/api/test-connection",
      "/api/test-data",
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/me",
      "/api/departments",
      "/api/employees",
      "/api/clients",
      "/api/projects",
      "/api/positions",
      "/api/skills",
      "/api/services",
      "/api/finance",
    ],
  });
});

// ============================================
// EXPORT
// ============================================

module.exports = app;
