// api/index.js - FIXED VERSION
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

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

// ============================================
// UNIVERSAL ROUTE LOADER - WORKS FOR BOTH FACTORIES AND DIRECT ROUTERS
// ============================================

console.log("🚀 Initializing routes...");

// Helper to create placeholder routes
function createPlaceholderRouter(entityName) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({
      success: true,
      message: `${entityName} API`,
      data: [],
      count: 0,
      timestamp: new Date().toISOString(),
      note: "Placeholder route - Check route loading",
    });
  });

  router.get("/:id", (req, res) => {
    res.json({
      success: true,
      message: `Get ${entityName} ${req.params.id}`,
      data: { id: req.params.id, name: "Example" },
      timestamp: new Date().toISOString(),
    });
  });

  router.post("/", (req, res) => {
    res.status(201).json({
      success: true,
      message: `Created ${entityName}`,
      data: req.body,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// UNIVERSAL ROUTE LOADER - FIXED VERSION
function loadRouteUniversal(routePath, routeName) {
  try {
    console.log(`🔍 Loading ${routeName} from: ${routePath}`);

    // Clear require cache for development
    if (process.env.NODE_ENV === "development") {
      const resolvedPath = require.resolve(routePath);
      delete require.cache[resolvedPath];
    }

    // Load the route module
    const routeModule = require(routePath);

    // DEBUG logging
    console.log(`📦 ${routeName} module type:`, typeof routeModule);

    // CASE 1: Already a router object (your routes export this)
    if (routeModule && routeModule.stack && Array.isArray(routeModule.stack)) {
      console.log(`✅ ${routeName} is already a router (direct export)`);
      return routeModule;
    }

    // CASE 2: Factory function
    if (typeof routeModule === "function") {
      console.log(`⚙️ ${routeName} is a factory function`);

      const router = express.Router();
      const paramCount = routeModule.length;

      try {
        if (paramCount === 0) {
          // Factory creates its own router
          const result = routeModule();
          if (result && result.stack) {
            console.log(`✅ ${routeName} factory returned router`);
            return result;
          }
          console.warn(
            `⚠️ ${routeName} factory returned non-router, using created router`
          );
          return router;
        } else if (paramCount === 1) {
          // Factory expects router parameter
          return routeModule(router);
        } else if (paramCount === 2) {
          // Try to load controller
          try {
            // Clean route name for controller lookup (remove 'Routes' suffix and plural 's')
            let controllerName = routeName;
            if (controllerName.endsWith("Routes")) {
              controllerName = controllerName.replace("Routes", "");
            }
            if (controllerName.endsWith("s")) {
              controllerName = controllerName.slice(0, -1);
            }

            const controllerPath = `../src/controllers/${controllerName}Controller`;
            const controller = require(controllerPath);
            console.log(`✅ Loaded controller for ${routeName}`);
            return routeModule(router, controller);
          } catch (controllerError) {
            console.warn(
              `⚠️ Could not load controller for ${routeName}:`,
              controllerError.message
            );
            return routeModule(router, {});
          }
        } else {
          // Complex factory - try with router
          return routeModule(router);
        }
      } catch (factoryError) {
        console.error(
          `❌ Factory execution failed for ${routeName}:`,
          factoryError.message
        );
        throw factoryError;
      }
    }

    // CASE 3: Unknown export type
    console.warn(
      `⚠️ ${routeName} has unknown export type, attempting to use as router`
    );
    return routeModule;
  } catch (error) {
    console.error(`❌ Failed to load ${routeName}:`, error.message);
    throw error; // Re-throw to be caught by outer handler
  }
}

// Define all routes with their paths
const routeConfigs = [
  { path: "../src/routes/auth", name: "auth" },
  { path: "../src/routes/clientRoutes", name: "clients" },
  { path: "../src/routes/employeeRoutes", name: "employees" },
  { path: "../src/routes/projectRoutes", name: "projects" },
  { path: "../src/routes/departmentRoutes", name: "departments" },
  { path: "../src/routes/positionRoutes", name: "positions" },
  { path: "../src/routes/skillRoutes", name: "skills" },
  { path: "../src/routes/serviceRoutes", name: "services" },
  { path: "../src/routes/financeRoutes", name: "finance" },
];

// Load and mount all routes
routeConfigs.forEach(({ path, name }) => {
  try {
    console.log(`\n🔄 Processing route: ${name}`);
    const router = loadRouteUniversal(path, name);

    // Validate it's a router
    if (router && router.stack && Array.isArray(router.stack)) {
      app.use(`/api/${name}`, router);
      console.log(
        `✅ SUCCESS: Mounted /api/${name} with ${router.stack.length} route handlers`
      );

      // Log mounted routes for debugging
      if (router.stack.length > 0) {
        console.log(`📋 Routes for /api/${name}:`);
        router.stack.forEach((layer) => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods)
              .map((m) => m.toUpperCase())
              .join(", ");
            const path = layer.route.path;
            console.log(`   ${methods.padEnd(8)} ${path}`);
          }
        });
      }
    } else {
      console.error(`❌ ${name} did not return a valid Router`);
      console.error(`   Got:`, router?.constructor?.name);
      throw new Error(`Invalid router returned from ${name}`);
    }
  } catch (error) {
    console.error(`🚨 ERROR mounting /api/${name}:`, error.message);
    console.log(`⚠️ Using placeholder router for /api/${name}`);
    app.use(`/api/${name}`, createPlaceholderRouter(name));
  }
});

// Try analytics separately
try {
  const analyticsPath = "../src/routes/analyticsRoutes";
  console.log(`\n🔍 Loading analytics from: ${analyticsPath}`);

  const analyticsModule = require(analyticsPath);

  if (typeof analyticsModule === "function") {
    const analyticsRouter = express.Router();
    app.use("/api/analytics", analyticsModule(analyticsRouter));
    console.log("✅ Mounted /api/analytics (factory)");
  } else if (analyticsModule && analyticsModule.stack) {
    app.use("/api/analytics", analyticsModule);
    console.log("✅ Mounted /api/analytics (direct)");
  } else {
    console.warn("⚠️ Analytics module is not a valid router");
  }
} catch (e) {
  console.log("ℹ️ Analytics routes not found or failed to load, skipping...");
}

// ============================================
// TEST ENDPOINTS FOR VERIFICATION
// ============================================

// Route verification endpoint
app.get("/api/routes-debug", (req, res) => {
  const routes = [];

  // Collect all mounted routes
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Direct routes
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
            mountedAt: middleware.regexp.toString(),
          });
        }
      });
    }
  });

  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes,
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to verify routing works
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test endpoint - Working!",
    timestamp: new Date().toISOString(),
    routes: routeConfigs.map((r) => `/api/${r.name}`),
  });
});

// Database test endpoint
app.get("/api/db-test", async (req, res) => {
  try {
    await connectDB();
    res.json({
      success: true,
      message: "Database connection successful",
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
// DEBUG & ERROR HANDLING MIDDLEWARE
// ============================================

// Debug middleware - log all API requests
app.use("/api", (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Error handler
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

// 404 handler - must be last
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "/",
      "/health",
      "/api/test",
      "/api/db-test",
      "/api/routes-debug",
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
    timestamp: new Date().toISOString(),
  });
});

// Export the app
module.exports = app;
