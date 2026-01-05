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
// SIMPLE DIRECT ROUTE LOADING
// ============================================

console.log("🚀 Loading routes...");

// Map API paths to model names (fixing filename mismatches)
const modelMap = {
  departments: "Departments", // Your file is Departments.js (plural)
  employees: "Employee",
  clients: "Client",
  projects: "Project",
  positions: "Position",
  skills: "Skill",
  services: "Service",
  finance: "FinancialRecord",
  auth: "User",
};

// Function to load a route file
function loadRouteFile(routeName) {
  try {
    // Build path to route file
    const routePath = path.join(
      __dirname,
      "..",
      "src",
      "routes",
      `${routeName}.js`
    );

    console.log(`🔍 Loading ${routeName} from: ${routePath}`);

    // Check if file exists
    if (!fs.existsSync(routePath)) {
      console.log(`   ❌ Route file not found`);
      return null;
    }

    console.log(`   ✅ Route file exists`);

    // Clear require cache
    delete require.cache[require.resolve(routePath)];

    // Load the route
    const routeModule = require(routePath);

    if (!routeModule) {
      console.log(`   ❌ Route module is empty`);
      return null;
    }

    console.log(`   ✅ Route module loaded`);

    return routeModule;
  } catch (error) {
    console.error(`   ❌ Error loading route:`, error.message);
    return null;
  }
}

// Function to create a direct route (fallback)
function createDirectRoute(apiPath) {
  const router = express.Router();
  const entityName = apiPath.replace("/api/", "");
  const modelName =
    modelMap[entityName] ||
    entityName.charAt(0).toUpperCase() + entityName.slice(1, -1);

  console.log(
    `   Creating direct route for ${apiPath} using model: ${modelName}`
  );

  // GET all
  router.get("/", async (req, res) => {
    try {
      await connectDB();

      // Try to load the model
      const modelPath = path.join(
        __dirname,
        "..",
        "src",
        "models",
        `${modelName}.js`
      );

      if (!fs.existsSync(modelPath)) {
        console.log(`Model file not found: ${modelPath}`);
        return res.json({
          success: true,
          message: `${entityName} API`,
          count: 0,
          data: [],
          timestamp: new Date().toISOString(),
          note: `Model ${modelName} not found at ${modelPath}`,
        });
      }

      const Model = require(modelPath);

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query
      const query = { isActive: true };

      // Search filter
      if (req.query.search) {
        if (Model.schema.paths.name) {
          query.name = { $regex: req.query.search, $options: "i" };
        }
        if (Model.schema.paths.email) {
          query.$or = [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ];
        }
      }

      // Get data with pagination
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
        note: "Loaded via direct route",
      });
    } catch (error) {
      console.error(`Error in ${apiPath}:`, error);
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
      await connectDB();

      const modelPath = path.join(
        __dirname,
        "..",
        "src",
        "models",
        `${modelName}.js`
      );

      if (!fs.existsSync(modelPath)) {
        return res.status(404).json({
          success: false,
          error: `Model ${modelName} not found`,
          timestamp: new Date().toISOString(),
        });
      }

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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST create
  router.post("/", async (req, res) => {
    try {
      await connectDB();

      const modelPath = path.join(
        __dirname,
        "..",
        "src",
        "models",
        `${modelName}.js`
      );

      if (!fs.existsSync(modelPath)) {
        return res.status(404).json({
          success: false,
          error: `Model ${modelName} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      const Model = require(modelPath);
      const item = await Model.create(req.body);

      res.status(201).json({
        success: true,
        data: item,
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

  return router;
}

// ============================================
// MOUNT ALL ROUTES
// ============================================

const routeConfigs = [
  { routeFile: "auth", apiPath: "/api/auth" },
  { routeFile: "clientRoutes", apiPath: "/api/clients" },
  { routeFile: "employeeRoutes", apiPath: "/api/employees" },
  { routeFile: "projectRoutes", apiPath: "/api/projects" },
  { routeFile: "departmentRoutes", apiPath: "/api/departments" },
  { routeFile: "positionRoutes", apiPath: "/api/positions" },
  { routeFile: "skillRoutes", apiPath: "/api/skills" },
  { routeFile: "serviceRoutes", apiPath: "/api/services" },
  { routeFile: "financeRoutes", apiPath: "/api/finance" },
];

console.log("\n🔄 Mounting routes...");

routeConfigs.forEach(({ routeFile, apiPath }) => {
  console.log(`\n📌 Processing ${apiPath}`);

  // Try to load the route file
  const routeModule = loadRouteFile(routeFile);

  if (routeModule && routeModule.stack) {
    // Route file loaded successfully
    app.use(apiPath, routeModule);
    console.log(`✅ ROUTE FILE: Mounted ${apiPath} from ${routeFile}.js`);

    // Log the routes
    if (routeModule.stack.length > 0) {
      console.log(`   Routes in ${apiPath}:`);
      routeModule.stack.forEach((layer, i) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(", ");
          console.log(`     ${i + 1}. ${methods} ${layer.route.path}`);
        }
      });
    }
  } else {
    // Route file not found or invalid, use direct route
    console.log(`⚠️ Route file not found, using direct route for ${apiPath}`);
    const directRouter = createDirectRoute(apiPath);
    app.use(apiPath, directRouter);
    console.log(`✅ DIRECT ROUTE: Created for ${apiPath}`);
  }
});

// ============================================
// DEBUG ENDPOINTS
// ============================================

// Test all models
app.get("/api/debug/models", async (req, res) => {
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
            if (Model && Model.prototype && Model.prototype.$isMongooseModel) {
              const count = await Model.countDocuments();
              models.push({
                name: modelName,
                collection: Model.collection.name,
                count: count,
                loaded: true,
              });
            } else {
              models.push({
                name: modelName,
                error: "Not a Mongoose model",
                loaded: false,
              });
            }
          } catch (e) {
            models.push({
              name: modelName,
              error: e.message,
              loaded: false,
            });
          }
        }
      }
    }

    res.json({
      success: true,
      modelsDir,
      exists: fs.existsSync(modelsDir),
      models,
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

// Test specific endpoint
app.get("/api/debug/endpoints", (req, res) => {
  const endpoints = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Direct route
      endpoints.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      // Router middleware
      const basePath = middleware.regexp
        .toString()
        .replace(/^\/\^|\/\$\//g, "")
        .replace(/\\/g, "");
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          endpoints.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json({
    success: true,
    endpoints,
    timestamp: new Date().toISOString(),
  });
});

// Quick test
app.get("/api/quick-test", async (req, res) => {
  try {
    await connectDB();

    // Test Departments model specifically
    const deptModelPath = path.join(
      __dirname,
      "..",
      "src",
      "models",
      "Departments.js"
    );
    const deptExists = fs.existsSync(deptModelPath);

    let deptCount = 0;
    let deptData = [];

    if (deptExists) {
      const Departments = require(deptModelPath);
      deptCount = await Departments.countDocuments();
      deptData = await Departments.find({}).limit(3);
    }

    res.json({
      success: true,
      departments: {
        modelPath: deptModelPath,
        exists: deptExists,
        count: deptCount,
        sample: deptData,
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
      "/api/quick-test",
      "/api/debug/models",
      "/api/debug/endpoints",
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
