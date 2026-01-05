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
const fs = require("fs");
const path = require("path");

// ✅ SAFE SWAGGER (Vercel-compatible)
let swaggerDoc;
try {
  const yamlPath = path.join(process.cwd(), "openapi.yaml");
  if (fs.existsSync(yamlPath)) {
    const YAML = require("yamljs");
    swaggerDoc = YAML.load(yamlPath);
    console.log("✅ Swagger loaded from Vercel /api");
  }
} catch (error) {
  console.log("⚠️ Swagger fallback - openapi.yaml not found");
  swaggerDoc = {
    openapi: "3.0.3",
    info: { title: "Glitci API", version: "1.0.0" },
    paths: {},
  };
}

const app = express();

// Middleware (BEFORE routes)
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, env: process.env.NODE_ENV });
});

// Swagger (Vercel path)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes
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

app.use(errorHandler);

// ❌ REMOVE app.listen() - Vercel handles this
// MongoDB connection happens in route middleware (lazy connect)

// ✅ VERCEL REQUIRED EXPORT
module.exports = app;
