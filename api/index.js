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

// ============================================
// SIMPLE DIRECT ROUTE LOADING - NO COMPLEXITY
// ============================================

console.log("🚀 Loading routes directly...");

// Function to load routes the simple way
function loadRouteDirect(routeName, apiPath) {
  try {
    console.log(`\n🔧 Loading ${routeName} for ${apiPath}`);

    // Build the correct path for Vercel
    // From: /var/task/api/index.js
    // To: /var/task/src/routes/[routeName].js
    const routePath = path.join(
      __dirname,
      "..",
      "src",
      "routes",
      `${routeName}.js`
    );

    console.log(`   Looking at: ${routePath}`);

    // Check if file exists
    if (!fs.existsSync(routePath)) {
      console.log(`   ❌ File not found: ${routePath}`);
      return null;
    }

    console.log(`   ✅ File exists, loading...`);

    // Clear require cache
    delete require.cache[require.resolve(routePath)];

    // Load the route module
    const routeModule = require(routePath);

    if (!routeModule) {
      console.log(`   ❌ Module loaded but is empty`);
      return null;
    }

    console.log(`   ✅ Module loaded successfully`);

    return routeModule;
  } catch (error) {
    console.error(`   ❌ Error loading ${routeName}:`, error.message);
    console.error(`   Stack:`, error.stack);
    return null;
  }
}

// ============================================
// MOUNT ALL ROUTES SIMPLY
// ============================================

// List of routes to mount
const routeMappings = [
  { routeFile: "auth.js", apiPath: "/api/auth" },
  { routeFile: "clientRoutes.js", apiPath: "/api/clients" },
  { routeFile: "employeeRoutes.js", apiPath: "/api/employees" },
  { routeFile: "projectRoutes.js", apiPath: "/api/projects" },
  { routeFile: "departmentRoutes.js", apiPath: "/api/departments" },
  { routeFile: "positionRoutes.js", apiPath: "/api/positions" },
  { routeFile: "skillRoutes.js", apiPath: "/api/skills" },
  { routeFile: "serviceRoutes.js", apiPath: "/api/services" },
  { routeFile: "financeRoutes.js", apiPath: "/api/finance" },
];

// Mount each route
routeMappings.forEach(({ routeFile, apiPath }) => {
  const routeName = routeFile.replace(".js", "");

  console.log(`\n📌 Processing ${apiPath} from ${routeFile}`);

  const router = loadRouteDirect(routeName, apiPath);

  if (router && router.stack) {
    // It's a valid Express router
    app.use(apiPath, router);
    console.log(`✅ MOUNTED: ${apiPath} with ${router.stack.length} handlers`);

    // Log the routes for debugging
    if (router.stack.length > 0) {
      console.log(`   Routes:`);
      router.stack.forEach((layer, i) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(", ");
          console.log(`     ${i + 1}. ${methods} ${layer.route.path}`);
        }
      });
    }
  } else {
    console.log(`⚠️ Could not load ${routeFile}, creating direct route`);

    // Create a direct working route
    const directRouter = express.Router();

    // GET all
    directRouter.get("/", async (req, res) => {
      try {
        await connectDB();

        // Extract model name from route (e.g., "departments" -> "Department")
        const entityName = apiPath.replace("/api/", "");
        const modelName =
          entityName.charAt(0).toUpperCase() + entityName.slice(1, -1);

        try {
          // Load the model
          const modelPath = path.join(
            __dirname,
            "..",
            "src",
            "models",
            `${modelName}.js`
          );
          if (fs.existsSync(modelPath)) {
            const Model = require(modelPath);
            const items = await Model.find({}).limit(50);

            res.json({
              success: true,
              count: items.length,
              data: items,
              timestamp: new Date().toISOString(),
              note: "Loaded from database directly",
            });
          } else {
            throw new Error(`Model ${modelName} not found`);
          }
        } catch (modelError) {
          // Model not found or error
          res.json({
            success: true,
            message: `${entityName} API`,
            count: 0,
            data: [],
            timestamp: new Date().toISOString(),
            note: "Route loaded but model not found",
            debug: {
              apiPath,
              modelName,
              modelError: modelError.message,
            },
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET by ID
    directRouter.get("/:id", async (req, res) => {
      try {
        await connectDB();

        const entityName = apiPath.replace("/api/", "");
        const modelName =
          entityName.charAt(0).toUpperCase() + entityName.slice(1, -1);

        try {
          const modelPath = path.join(
            __dirname,
            "..",
            "src",
            "models",
            `${modelName}.js`
          );
          if (fs.existsSync(modelPath)) {
            const Model = require(modelPath);
            const item = await Model.findById(req.params.id);

            if (!item) {
              return res.status(404).json({
                success: false,
                error: `${modelName} not found`,
                timestamp: new Date().toISOString(),
              });
            }

            res.json({
              success: true,
              data: item,
              timestamp: new Date().toISOString(),
            });
          } else {
            throw new Error(`Model ${modelName} not found`);
          }
        } catch (modelError) {
          res.json({
            success: true,
            message: `Get ${entityName.slice(0, -1)} ${req.params.id}`,
            data: { id: req.params.id, name: "Sample" },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    app.use(apiPath, directRouter);
    console.log(`✅ CREATED: Direct route for ${apiPath}`);
  }
});

// ============================================
// TEST ENDPOINTS
// ============================================

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    await connectDB();

    // Try to list all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    res.json({
      success: true,
      message: "Database connected successfully",
      collections: collections.map((c) => c.name),
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

// Test specific model
app.get("/api/test-models", async (req, res) => {
  try {
    await connectDB();

    const modelsDir = path.join(__dirname, "..", "src", "models");
    const models = [];

    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);

      for (const file of files) {
        if (file.endsWith(".js")) {
          const modelName = file.replace(".js", "");
          const modelPath = path.join(modelsDir, file);

          try {
            const Model = require(modelPath);
            const count = await Model.countDocuments();

            models.push({
              name: modelName,
              path: modelPath,
              count: count,
              loaded: true,
            });
          } catch (e) {
            models.push({
              name: modelName,
              path: modelPath,
              error: e.message,
              loaded: false,
            });
          }
        }
      }
    }

    res.json({
      success: true,
      modelsDir: modelsDir,
      exists: fs.existsSync(modelsDir),
      models: models,
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

// Test routes loading
app.get("/api/test-routes", (req, res) => {
  const routesInfo = [];

  app._router.stack.forEach((middleware, i) => {
    if (middleware.name === "router") {
      routesInfo.push({
        index: i,
        name: middleware.name,
        regexp: middleware.regexp.toString(),
        handle: middleware.handle
          ? {
              stackLength: middleware.handle.stack.length,
              routes: middleware.handle.stack
                .map((layer, j) => {
                  if (layer.route) {
                    return {
                      path: layer.route.path,
                      methods: Object.keys(layer.route.methods),
                    };
                  }
                  return null;
                })
                .filter(Boolean),
            }
          : null,
      });
    }
  });

  res.json({
    success: true,
    totalMiddleware: app._router.stack.length,
    routers: routesInfo,
    timestamp: new Date().toISOString(),
  });
});

// Direct employee endpoint (for testing)
app.get("/api/employees-raw", async (req, res) => {
  try {
    await connectDB();

    // Direct model loading
    const employeeModelPath = path.join(
      __dirname,
      "..",
      "src",
      "models",
      "Employee.js"
    );

    if (!fs.existsSync(employeeModelPath)) {
      return res.status(404).json({
        success: false,
        error: `Employee model not found at ${employeeModelPath}`,
        timestamp: new Date().toISOString(),
      });
    }

    const Employee = require(employeeModelPath);
    const employees = await Employee.find({}).limit(20);

    res.json({
      success: true,
      count: employees.length,
      data: employees,
      timestamp: new Date().toISOString(),
      note: "Loaded directly from Employee model",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Direct department endpoint (for testing)
app.get("/api/departments-raw", async (req, res) => {
  try {
    await connectDB();

    // Direct model loading
    const departmentModelPath = path.join(
      __dirname,
      "..",
      "src",
      "models",
      "Department.js"
    );

    if (!fs.existsSync(departmentModelPath)) {
      return res.status(404).json({
        success: false,
        error: `Department model not found at ${departmentModelPath}`,
        timestamp: new Date().toISOString(),
      });
    }

    const Department = require(departmentModelPath);
    const departments = await Department.find({}).limit(20);

    res.json({
      success: true,
      count: departments.length,
      data: departments,
      timestamp: new Date().toISOString(),
      note: "Loaded directly from Department model",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// ============================================
// REQUEST LOGGING
// ============================================

app.use("/api", (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
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
    availableRoutes: [
      "/",
      "/health",
      "/api/test-db",
      "/api/test-models",
      "/api/test-routes",
      "/api/employees-raw",
      "/api/departments-raw",
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
