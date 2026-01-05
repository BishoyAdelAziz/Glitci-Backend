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

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Cache mongoose connection
let cached = global.mongoose;
async function connectDB() {
  if (cached && cached.conn) return cached.conn;
  if (!cached) cached = global.mongoose = { conn: null, promise: null };
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((conn) => conn);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Swagger - wrap in try-catch
try {
  const swaggerDoc = YAML.load(path.join(__dirname, "../openapi.yaml"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} catch (e) {
  console.error("Swagger load failed:", e.message);
}

// Routes
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

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, message: "Connected to DB" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Error handler last
app.use(require("../src/middleware/errorHandler"));

// CRITICAL FIX: Export the app directly, not wrapped in async
module.exports = app;
```

## Key Changes:

1. **Changed export from async function to direct app export** - This is the main fix
2. **Moved swagger loading inside try-catch** - Prevents crash if file missing
3. **Removed the outer try-catch around routes** - If routes fail to import, we need to see that error

## Check your folder structure:
```;
