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

// ============================================
// SIMPLE DIRECT ROUTE LOADING - NO FACTORY COMPLEXITY
// ============================================

console.log("🚀 Loading routes directly...");

// Helper to create placeholder routes (keep this same)
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

  return router;
}

// SIMPLE BRUTE-FORCE ROUTE LOADER
function loadRouteDirectly(routePath, routeName) {
  try {
    console.log(`🔄 Loading: ${routePath}`);

    // Clear require cache
    delete require.cache[require.resolve(routePath)];

    // Load the module
    const module = require(routePath);

    // DEBUG: Check what we got
    console.log(`   Type: ${typeof module}`);
    console.log(`   Is router? ${module && module.stack ? "YES" : "NO"}`);

    // If it's already a router, return it
    if (module && module.stack) {
      console.log(
        `✅ Loaded router for ${routeName} with ${module.stack.length} handlers`
      );
      return module;
    }

    // If it's a function, call it
    if (typeof module === "function") {
      try {
        const router = express.Router();
        const result = module(router);
        if (result && result.stack) {
          console.log(`✅ Factory created router for ${routeName}`);
          return result;
        }
        console.warn(`⚠️ Factory didn't return router for ${routeName}`);
        return router;
      } catch (err) {
        console.error(`❌ Factory error for ${routeName}:`, err.message);
        throw err;
      }
    }

    // If we get here, something is wrong
    throw new Error(`Unknown export type from ${routePath}`);
  } catch (error) {
    console.error(`❌ CRITICAL: Failed to load ${routeName}:`, error.message);
    console.error(error.stack);
    throw error;
  }
}

// Define routes to load
const routes = [
  { path: "../src/routes/auth.js", name: "auth" },
  { path: "../src/routes/clientRoutes.js", name: "clients" },
  { path: "../src/routes/employeeRoutes.js", name: "employees" },
  { path: "../src/routes/projectRoutes.js", name: "projects" },
  { path: "../src/routes/departmentRoutes.js", name: "departments" },
  { path: "../src/routes/positionRoutes.js", name: "positions" },
  { path: "../src/routes/skillRoutes.js", name: "skills" },
  { path: "../src/routes/serviceRoutes.js", name: "services" },
  { path: "../src/routes/financeRoutes.js", name: "finance" },
];

// Load and mount each route
routes.forEach(({ path, name }) => {
  console.log(`\n📌 Processing: /api/${name}`);

  try {
    const router = loadRouteDirectly(path, name);

    // Mount the router
    app.use(`/api/${name}`, router);
    console.log(`✅ MOUNTED: /api/${name}`);

    // Log the routes
    if (router.stack) {
      router.stack.forEach((layer, i) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(", ");
          console.log(`   ${i + 1}. ${methods} ${layer.route.path}`);
        }
      });
    }
  } catch (error) {
    console.error(`❌ FAILED to mount /api/${name}:`, error.message);

    // Create emergency route for debugging
    const emergencyRouter = express.Router();
    emergencyRouter.get("/", (req, res) => {
      res.status(503).json({
        success: false,
        message: `Route /api/${name} failed to load`,
        error: error.message,
        path: path,
        timestamp: new Date().toISOString(),
        debug: {
          node_env: process.env.NODE_ENV,
          cwd: process.cwd(),
          __dirname: __dirname,
        },
      });
    });

    app.use(`/api/${name}`, emergencyRouter);
    console.log(`⚠️ Mounted emergency route for /api/${name}`);
  }
});

// Special case for analytics
try {
  const analyticsPath = "../src/routes/analyticsRoutes";
  console.log(`\n📌 Processing: /api/analytics`);

  const analyticsModule = require(analyticsPath);
  if (analyticsModule && analyticsModule.stack) {
    app.use("/api/analytics", analyticsModule);
    console.log("✅ MOUNTED: /api/analytics (direct)");
  } else if (typeof analyticsModule === "function") {
    const analyticsRouter = express.Router();
    app.use("/api/analytics", analyticsModule(analyticsRouter));
    console.log("✅ MOUNTED: /api/analytics (factory)");
  }
} catch (e) {
  console.log("ℹ️ Analytics routes not found, skipping...");
}
// ============================================
// TEST ENDPOINTS FOR VERIFICATION
// ============================================

// Route verification endpoint
// Debug endpoint to check what's loaded
app.get("/api/debug-loaded-routes", (req, res) => {
  const loadedRoutes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.name === "router") {
      const path = middleware.regexp.toString();
      const handlers = middleware.handle.stack.length;
      loadedRoutes.push({
        path: path,
        handlers: handlers,
        routes: middleware.handle.stack
          .map((layer) => {
            if (layer.route) {
              return {
                methods: Object.keys(layer.route.methods),
                path: layer.route.path,
              };
            }
            return null;
          })
          .filter(Boolean),
      });
    }
  });

  res.json({
    success: true,
    loadedRoutes: loadedRoutes,
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
