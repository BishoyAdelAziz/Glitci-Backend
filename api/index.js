// api/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

// Resolve swagger file relative to the project root
const swaggerDoc = YAML.load(path.join(__dirname, "../openapi.yaml"));

const app = express();

// Security + parsing
app.use(helmet());
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

// Best-effort rate limit (consider external store for production)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Cache mongoose connection across invocations
let cached = global.mongoose;
async function connectDB() {
  if (cached && cached.conn) return cached.conn;
  if (!cached) cached = global.mongoose = { conn: null, promise: null };
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        // serverSelectionTimeoutMS: 5000, // optional hardening
      })
      .then((conn) => conn);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes (ensure these files export routers only)
app.use("/api/auth", require("../src/routes/auth"));
app.use("/api/services", require("../src/routes/serviceRoutes"));
app.use("/api/clients", require("../src/routes/clientRoutes"));
app.use("/api/employees", require("../src/routes/employeeRoutes"));
app.use("/api/projects", require("../src/routes/projectRoutes"));
app.use("/api/analytics", require("../src/routes/analyticsRoutes"));
app.use("/api/departments", require("../src/routes/departmentRoutes"));
app.use("/api/positions", require("../src/routes/positionRoutes"));
app.use("/api/skills", require("../src/routes/skillRoutes"));
app.use("/api/finance", require("../src/routes/financeRoutes"));

// Health
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Error handler last
app.use(require("../src/middleware/errorHandler"));

// Export serverless handler
module.exports = async (req, res) => {
  // Connect here if most routes hit DB; otherwise connect inside handlers
  try {
    await connectDB();
  } catch (err) {
    // Let your error handler format response
  }
  return app(req, res);
};
